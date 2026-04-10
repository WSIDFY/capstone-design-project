package com.example.fds_aml.service;

import com.example.fds_aml.dto.AiAnalysisResponseDto;
import com.example.fds_aml.dto.TransactionRequestDto;
import com.example.fds_aml.entity.Transaction;
import com.example.fds_aml.repository.TransactionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import java.util.List;

@Service
@RequiredArgsConstructor
public class TransactionService {

    private final TransactionRepository transactionRepository;
    private final ReportService reportService;
    private final RestTemplate restTemplate = new RestTemplate();

    public Transaction processTransaction(TransactionRequestDto dto) {
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

        Transaction savedTransaction = transactionRepository.save(transaction);

        try {
            String aiServerUrl = "http://localhost:5000/predict";
            AiAnalysisResponseDto aiResponse = restTemplate.postForObject(aiServerUrl, dto, AiAnalysisResponseDto.class);

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

        return savedTransaction;
    }

    public List<Transaction> findAllTransactions() {
        return transactionRepository.findAll();
    }
}