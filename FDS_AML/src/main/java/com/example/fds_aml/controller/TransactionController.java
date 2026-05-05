package com.example.fds_aml.controller;

import com.example.fds_aml.dto.TransactionRequestDto;
import com.example.fds_aml.entity.Transaction;
import com.example.fds_aml.service.TransactionService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/transactions")
@RequiredArgsConstructor
public class TransactionController {

    private final TransactionService transactionService;

    @PostMapping
    public Transaction createTransaction(@RequestBody TransactionRequestDto dto) {
        return transactionService.processTransaction(dto);
    }

    @GetMapping
    public List<Transaction> getAllTransactions() {
        return transactionService.findAllTransactions();
    }
}