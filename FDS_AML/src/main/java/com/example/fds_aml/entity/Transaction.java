package com.example.fds_aml.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import java.time.LocalDateTime;

@Entity
@Table(name = "transactions")
@Getter
@Setter
@NoArgsConstructor
public class Transaction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Integer step;
    private String type;
    private Integer amount;
    private String sender;
    private Double oldbalanceOrg;
    private Double newbalanceOrig;
    private String receiver;
    private Double oldbalanceDest;
    private Double newbalanceDest;
    private String location;
    private Integer is_blacklist_dest;
    private String riskLevel;
    private LocalDateTime transactionDate;

    @Column(columnDefinition = "TEXT")
    private String aiReport;
}