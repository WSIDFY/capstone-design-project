package com.example.fds_aml.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class BlacklistUpdateRequestDto {

    @JsonProperty("is_blacklist")
    private Integer isBlacklist;
}
