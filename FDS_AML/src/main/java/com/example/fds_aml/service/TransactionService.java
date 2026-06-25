package com.example.fds_aml.service;

import com.example.fds_aml.dto.AiAnalysisResponseDto;
import com.example.fds_aml.dto.TransactionRequestDto;
import com.example.fds_aml.entity.Transaction;
import com.example.fds_aml.repository.TransactionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.beans.factory.annotation.Value;
import com.example.fds_aml.dto.RiskUpdateRequestDto;
import com.example.fds_aml.dto.BlacklistUpdateRequestDto;
import java.util.List;

@Service
@RequiredArgsConstructor
public class TransactionService {

    private final TransactionRepository transactionRepository;
    private final ReportService reportService;
    private final RestTemplate restTemplate = new RestTemplate();

    @Value("${ai.server.url}")
    private String aiServerUrl;

    public Transaction processTransaction(TransactionRequestDto dto) {
	System.out.println("\n[GENERATOR → BACKEND] 거래 수신");
System.out.println("type=" + dto.getType()
        + ", amount=" + dto.getAmount()
        + ", sender=" + dto.getSender()
        + ", receiver=" + dto.getReceiver()
        + ", is_blacklist=" + dto.getIsBlacklist());
        Transaction transaction = new Transaction();
        transaction.setStep(dto.getStep());
        transaction.setType(dto.getType());
        transaction.setAmount(dto.getAmount());
        transaction.setSender(dto.getSender());
        transaction.setOldbalanceOrg(dto.getOldbalanceOrg());
        transaction.setNewbalanceOrig(dto.getNewbalanceOrig());
        transaction.setReceiver(dto.getReceiver());
        transaction.setOldbalanceDest(dto.getOldbalanceDest());
        transaction.setNewbalanceDest(dto.getNewbalanceDest());
        transaction.setTransactionDate(dto.getTransactionDate());
        transaction.setIsBlacklist(dto.getIsBlacklist());

        Transaction savedTransaction = transactionRepository.save(transaction);
	System.out.println("[DB 저장 완료] transactionId=" + savedTransaction.getId());

        try {
	System.out.println("[AI 서버 호출] " + aiServerUrl);
        AiAnalysisResponseDto aiResponse = restTemplate.postForObject(aiServerUrl, dto, AiAnalysisResponseDto.class);
	if (aiResponse != null) {
    System.out.println("[AI 응답] suspicious=" + aiResponse.isSuspicious()
            + ", probability=" + aiResponse.getFraudProbability());
}

            if (aiResponse != null && aiResponse.isSuspicious()) {
                savedTransaction.setRiskLevel("위험");
                
                String reportText = reportService.generateQwenReport(aiResponse);
                savedTransaction.setAiReport(reportText);
                savedTransaction = transactionRepository.save(savedTransaction);
            } else {
                savedTransaction.setRiskLevel("정상");
                savedTransaction = transactionRepository.save(savedTransaction);
            }
        } catch (Exception e) {
            System.out.println("AI 서버 통신 에러 " + e.getMessage());
        }
	System.out.println("[최종 저장 완료] id=" + savedTransaction.getId()
        + ", riskLevel=" + savedTransaction.getRiskLevel()
        + ", aiReport=" + (savedTransaction.getAiReport() != null ? "생성됨" : "없음"));

        return savedTransaction;
    }

    public List<Transaction> findAllTransactions() {
        return transactionRepository.findAll();
    }

public Transaction updateRisk(Long id, RiskUpdateRequestDto dto) {
    Transaction transaction = transactionRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("거래 내역을 찾을 수 없습니다."));

    transaction.setRiskLevel(dto.getRiskLevel());

    return transactionRepository.save(transaction);
}
public Transaction updateBlacklist(Long id, BlacklistUpdateRequestDto dto) {

    Transaction transaction = transactionRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("거래 내역을 찾을 수 없습니다."));

        Integer blacklistValue = dto.getIsBlacklist();

    transaction.setIsBlacklist(blacklistValue);

    // 블랙리스트 등록 시 해당 거래만 위험으로 변경
    if (blacklistValue != null && blacklistValue != 0) {
        transaction.setRiskLevel("위험");
    }
    // 블랙리스트 해제 시 해당 거래만 정상으로 변경
    else {
        transaction.setRiskLevel("정상");
    }

    return transactionRepository.save(transaction);
}
}
