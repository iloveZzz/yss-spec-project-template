package com.yss.cloud.dto.result;

import java.io.Serializable;

/**
 * @author zhudaoming
 */
public class Result implements Serializable {

  private static final long serialVersionUID = 2405172041950251807L;

  private static final String DEFAULT_MESSAGE = "数据返回正常";
  private static final String DEFAULT_TIPS = "信息返回正常";

  /** 状态 */
  private boolean success;
  /** 返回数据格式 */
  private String dataType;
  /** 返回状态码 */
  private Object code;
  /** 返回消息 */
  private String message = DEFAULT_MESSAGE;
  /** 返回提示消息 */
  private String tips = DEFAULT_TIPS;
  public Object getCode() {
    return code;
  }

  public Result setCode(Object code) {
    this.code = code;
    return this;
  }

  public String getMessage() {
    return message;
  }

  public Result setMessage(String message) {
    this.message = message;
    return this;
  }

  public String getTips() {
    return tips;
  }

  public void setTips(String tips) {
    this.tips = tips;
  }

  public boolean isSuccess() {
    return success;
  }

  public void setSuccess(boolean success) {
    this.success = success;
  }

  public String getDataType() {
    return dataType;
  }

  public void setDataType(String dataType) {
    this.dataType = dataType;
  }

  public static Result buildSuccess() {
    Result response = new Result();
    response.setSuccess(true);
    response.setCode("DM-A0001");
    return response;
  }

  public static Result buildSuccess(String message) {
    Result response = new Result();
    response.setSuccess(true);
    response.setMessage(message);
    return response;
  }
  public static Result buildSuccess(String code,String message) {
    Result response = new Result();
    response.setSuccess(true);
    response.setCode(code);
    response.setMessage(message);
    return response;
  }
  public static Result buildFailure(String message) {
    Result response = new Result();
    response.setSuccess(false);
    response.setMessage(message);
    return response;
  }
  public static Result buildFailure(String errCode,String message) {
    Result response = new Result();
    response.setSuccess(false);
    response.setCode(errCode);
    response.setMessage(message);
    return response;
  }
  @Override
  public String toString() {
    return "Response [success=" + success + "]";
  }

}
