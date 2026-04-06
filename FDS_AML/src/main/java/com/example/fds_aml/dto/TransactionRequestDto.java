package com.example.fds_aml.dto;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class TransactionRequestDto {
    private String sender;
    private String receiver;
    private Integer amount;
    private String type;
    private String location;
}