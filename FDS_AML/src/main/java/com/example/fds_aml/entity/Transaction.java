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
    private String receiver;

    @Column(name = "oldbalance_org")
    private Double oldbalanceOrg;

    @Column(name = "newbalance_orig")
    private Double newbalanceOrig;

    @Column(name = "oldbalance_dest")
    private Double oldbalanceDest;

    @Column(name = "newbalance_dest")
    private Double newbalanceDest;

    private String location;

    @Column(name = "is_blacklist")
    private Integer isBlacklist;

    @Column(name = "risk_level")
    private String riskLevel;

    @Column(name = "transaction_date")
    private LocalDateTime transactionDate;

    @Column(name = "ai_report", columnDefinition = "TEXT")
    private String aiReport;
}