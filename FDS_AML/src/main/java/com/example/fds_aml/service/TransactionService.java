package com.example.fds_aml.service;

import com.example.fds_aml.dto.TransactionRequestDto;
import com.example.fds_aml.entity.Transaction;
import com.example.fds_aml.repository.TransactionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class TransactionService {

    private final TransactionRepository transactionRepository;

    public Transaction save(TransactionRequestDto dto) {
        Transaction transaction = new Transaction();
        transaction.setSender(dto.getSender());
        transaction.setReceiver(dto.getReceiver());
        transaction.setAmount(dto.getAmount());
        transaction.setType(dto.getType());
        transaction.setLocation(dto.getLocation());
        transaction.setTransactionDate(LocalDateTime.now());
        transaction.setRiskLevel("정상");

        return transactionRepository.save(transaction);
    }

    public List<Transaction> findAll() {
        return transactionRepository.findAll();
    }
}