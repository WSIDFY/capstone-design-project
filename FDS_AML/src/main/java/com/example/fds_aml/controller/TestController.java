package com.example.fds_aml.controller;

import com.example.fds_aml.dto.AiAnalysisResponseDto;
import com.example.fds_aml.service.ReportService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequiredArgsConstructor
public class TestController {

    private final ReportService reportService;

    @GetMapping("/test")
    public String test() {
        return "서버 정상 실행";
    }

    // 💡 프론트 연결 전 Qwen 보고서 단독 테스트용 주소
    @GetMapping("/test-report")
    public String testQwenReport() {
        // 1. 민재님 AI가 '보이스피싱 의심' 데이터를 보냈다고 가짜(Mock) 상황 세팅
        AiAnalysisResponseDto fakeResponse = new AiAnalysisResponseDto();
        fakeResponse.setSuspicious(true);
        
        AiAnalysisResponseDto.EvidenceMaterial evidence = new AiAnalysisResponseDto.EvidenceMaterial();
        evidence.setDesc("이체 후 잔액이 비정상적으로 0원에 수렴하며 과거 거래 이력이 없는 신규 수취인에게 전액 이체됨");
        
        fakeResponse.setEvidenceMaterials(List.of(evidence));

        // 2. Qwen API 호출해서 텍스트 보고서 받아오기
        String finalReport = reportService.generateQwenReport(fakeResponse);
        
        // 3. 화면에 예쁘게 출력되도록 포맷팅해서 리턴
        return "<h3>🤖 Qwen AI 관제 보고서 테스트 결과</h3><hr><p>" + finalReport + "</p>";
    }
}