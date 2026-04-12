package com.example.fds_aml.service;

import com.example.fds_aml.dto.AiAnalysisResponseDto;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpEntity;
import org.springframework.http.ResponseEntity;
import org.springframework.http.MediaType;

// 💡 JSON 껍데기 까는 가위(ObjectMapper) 임포트 추가!
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
                .collect(Collectors.joining("\n- "));

        String prompt = String.format(
            "너는 은행의 FDS(이상금융거래탐지) 관제 요원을 위한 시니어 분석 전문가야 아래 의심 거래 시나리오 판단 기준을 완벽하게 숙지해\n\n" +
            "[의심 거래 시나리오 기준]\n" +
            "1 보이스피싱 비정상적 전액성(이체 후 잔액 0원 수렴) 및 과거 거래 이력이 없는 신규 관계성 존재 (주로 TRANSFER)\n" +
            "2 자금세탁(연쇄성/Chaining) 자금 이체 후 1~2 step 내에 다시 타 계좌로 이체되거나 현금화(CASH_OUT)되는 빠른 통과 계좌(Pass-through) 패턴\n" +
            "3 자금세탁(구조화/Layering) 1 step 내에 동일 발신인이 다수의 신규/유령 수취인에게 자금을 쪼개어 송금 송금액 합계가 기존 잔액의 95퍼센트 이상이며 금액이 균등함\n" +
            "4 블랙리스트 과거 사기 이력이 식별된 위험 계좌와의 거래\n\n" +
            "[AI 모델 탐지 근거]\n- %s\n\n" +
            "위 탐지 근거를 분석해서 이 거래가 어떤 사기 유형(보이스피싱 구조화 연쇄성 등)에 해당하는지 판별하고 관제 요원이 즉각 조치할 수 있도록 핵심만 2문장 내외의 명확한 한국어 보고서로 작성해줘. 단, 절대 마크다운 기호(** 등)나 작은따옴표(''), 큰따옴표(\\\"\\\")를 사용하지 말고 순수한 텍스트로만 출력해.",
            evidenceSummary
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
            
            // 💡 여기서부터 추가/수정된 부분입니다! (골판지 상자 까기)
            ObjectMapper mapper = new ObjectMapper();
            JsonNode rootNode = mapper.readTree(response.getBody());
            
            // JSON 트리에서 choices -> 0번째 -> message -> content 경로를 찾아가서 텍스트만 쏙 빼옴
            String extractedReport = rootNode.path("choices").get(0).path("message").path("content").asText();
            
            return extractedReport; // 깔끔한 알맹이만 리턴!

        } catch (Exception e) {
            System.out.println("Qwen API 연동 에러: " + e.getMessage());
            return "[AI 자동 생성 보고서] 심각한 이상 징후가 발견되었습니다 주요 사유: " + aiResponse.getEvidenceMaterials().get(0).getDesc();
        }
    }
}