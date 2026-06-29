package com.yss.cloud.sankuai.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "spring.leaf", ignoreInvalidFields = true)
public class LeafConf {
  private boolean leafSegmentEnable;
  private boolean leafSnowflakeEnable;

  public boolean isLeafSegmentEnable() {
    return leafSegmentEnable;
  }

  public void setLeafSegmentEnable(boolean leafSegmentEnable) {
    this.leafSegmentEnable = leafSegmentEnable;
  }

  public boolean isLeafSnowflakeEnable() {
    return leafSnowflakeEnable;
  }

  public void setLeafSnowflakeEnable(boolean leafSnowflakeEnable) {
    this.leafSnowflakeEnable = leafSnowflakeEnable;
  }

  @Override
  public String toString() {
    return "LeafConf{"
        + "leafSegmentEnable="
        + leafSegmentEnable
        + ", leafSnowflakeEnable="
        + leafSnowflakeEnable
        + ", leafSnowflakePort="
        + '}';
  }
}
