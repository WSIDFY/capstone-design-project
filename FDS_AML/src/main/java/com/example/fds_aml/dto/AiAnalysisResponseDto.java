package com.example.fds_aml.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Getter;
import lombok.Setter;
import java.util.List;
import java.util.Map;

@Getter
@Setter
public class AiAnalysisResponseDto {

    @JsonProperty("is_suspicious")
    private boolean isSuspicious;

    @JsonProperty("fraud_probability")
    private double fraudProbability;

    @JsonProperty("is_blacklist")
    private boolean isBlacklist;

    @JsonProperty("evidence_materials")
    private List<EvidenceMaterial> evidenceMaterials;

    @JsonProperty("raw_data")
    private Map<String, Object> rawData;

    @Getter
    @Setter
    public static class EvidenceMaterial {
        private String column;
        private double contribution;

        @JsonProperty("actual_value")
        private Object actualValue;

        private String desc;
    }
}
