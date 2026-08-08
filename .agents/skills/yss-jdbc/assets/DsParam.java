package com.yss.cloud.jdbc.db;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.ToString;

@Data
@AllArgsConstructor
@NoArgsConstructor
@ToString
public class DsParam {
    private String driverClass;
    private String jdbc;
    private String userName;
    private String password;


}
