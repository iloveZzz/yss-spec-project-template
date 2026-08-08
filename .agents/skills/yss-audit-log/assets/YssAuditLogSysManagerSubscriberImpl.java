package com.yss.cloud.audit.subscriber.impl;

import com.yss.cloud.audit.subscriber.YssAuditSubscriber;
import com.yss.cloud.dto.audit.message.AuditMessage;
import com.yss.datamiddle.feign.YssDmSystemManageFeign;
import org.springframework.beans.factory.annotation.Autowired;

/**
 * @author zhudaoming
 */
public class YssAuditLogSysManagerSubscriberImpl implements YssAuditSubscriber {
    @Autowired
    private YssDmSystemManageFeign yssDmSystemManageFeign;
    @Override
    public void execute(AuditMessage message) {
        yssDmSystemManageFeign.saveAuditLog(message);
    }
}
