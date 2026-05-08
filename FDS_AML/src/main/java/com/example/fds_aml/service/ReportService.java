package com.example.fds_aml.service;

import com.example.fds_aml.dto.AiAnalysisResponseDto;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpEntity;
import org.springframework.http.ResponseEntity;
import org.springframework.http.MediaType;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.JsonNode;

import java.util.stream.Collectors;
import java.util.Map;
import java.util.HashMap;

@Service
public class ReportService {

    private final RestTemplate restTemplate;

    @Value("${ai.qwen.url}")
    private String qwenApiUrl;

    @Value("${ai.qwen.api-key}")
    private String apiKey;

    public ReportService() {
        this.restTemplate = new RestTemplate();
    }

    public String generateQwenReport(AiAnalysisResponseDto aiResponse) {
        
        String evidenceSummary = aiResponse.getEvidenceMaterials().stream()
                .map(AiAnalysisResponseDto.EvidenceMaterial::getDesc)
                .collect(Collectors.joining("\n"));

        Map<String, Object> rawData = aiResponse.getRawData();
        String amount = rawData != null && rawData.get("amount") != null ? rawData.get("amount").toString() : "알 수 없음";
        String sender = rawData != null && rawData.get("sender") != null ? rawData.get("sender").toString() : "미상";
        String receiver = rawData != null && rawData.get("receiver") != null ? rawData.get("receiver").toString() : "미상";
        
        int probPercent = (int) (aiResponse.getFraudProbability() * 100);

        String prompt = String.format(
            "너는 은행의 전문 FDS 관제 요원이야. 전달받은 [데이터]를 바탕으로, 반드시 아래의 [출력 템플릿] 양식과 토씨 하나 틀리지 않게 똑같은 구조로 보고서를 작성해. 절대 마크다운 기호(** 등)나 따옴표를 쓰지 마.\n\n" +
            "[데이터]\n" +
            "- 신뢰도: %d%%\n" +
            "- 송금인 계좌: %s\n" +
            "- 수취인 계좌: %s\n" +
            "- 거래 금액: %s\n" +
            "- AI 탐지 근거: %s\n\n" +
            "[출력 템플릿]\n" +
            "본 거래는 AI 모델에 의해 [신뢰도]%%의 신뢰도로 의심거래로 분류되었습니다.\n\n" +
            "[분석 근거]\n" +
            "1. 거래 이력 분석: 송금인 계좌([송금인])와 수취인 계좌([수취인]) 간의 관계 요약 (근거 바탕)\n" +
            "2. 금액 이상치 분석: ₩[금액]이 왜 비정상적인지 요약 (근거 바탕)\n" +
            "3. [추가 탐지 근거가 있다면 번호를 매겨서 요약 작성]\n\n" +
            "[위험 평가]\n" +
            "- 예상 사기 유형: [보이스피싱/자금세탁/블랙리스트 중 택 1]\n" +
            "- 예상 피해 금액: ₩[금액]\n" +
            "- 긴급도: 즉시 조치 필요",
            probPercent, sender, receiver, amount, evidenceSummary
        );

        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setBearerAuth(apiKey);

            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("model", "qwen-plus");
            
            Map<String, String> message = new HashMap<>();
            message.put("role", "user");
            message.put("content", prompt);
            requestBody.put("messages", new Map[]{message});

            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);

            ResponseEntity<String> response = restTemplate.postForEntity(qwenApiUrl, entity, String.class);
            
            ObjectMapper mapper = new ObjectMapper();
            JsonNode rootNode = mapper.readTree(response.getBody());
            String extractedReport = rootNode.path("choices").get(0).path("message").path("content").asText();
            
            String cleanReport = extractedReport.replace("**", "").replace("'", "").replace("\"", "");
            
            return cleanReport;

        } catch (Exception e) {
            System.out.println("Qwen API 연동 에러: " + e.getMessage());
            return "본 거래는 AI 모델에 의해 의심거래로 분류되었습니다.\n\n[분석 근거]\n1. " + aiResponse.getEvidenceMaterials().get(0).getDesc() + "\n\n[위험 평가]\n- 긴급도: 즉시 조치 필요";
        }
    }
}