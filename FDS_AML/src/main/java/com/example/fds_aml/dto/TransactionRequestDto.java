package com.example.fds_aml.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.Getter;
import lombok.Setter;
import java.time.LocalDateTime;

@Getter
@Setter
public class TransactionRequestDto {
    private Integer step;
    private String type;
    private Integer amount;
    private String sender;
    private Double oldbalanceOrg;
    private Double newbalanceOrig;
    private String receiver;
    private Double oldbalanceDest;
    private Double newbalanceDest;

    // 파이썬에서 쏘는 시간 형식을 스프링이 찰떡같이 알아먹도록 설정
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime transactionDate;
}