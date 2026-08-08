package com.yss.cloud.audit.subscriber;

import com.yss.cloud.audit.configuration.AuditConfigurationProperties;
import com.yss.cloud.dto.audit.message.AuditMessage;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;

import javax.annotation.PostConstruct;
import java.util.List;
import java.util.concurrent.ArrayBlockingQueue;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@Slf4j
public class YssAuditPublishService {

    private final BlockingQueue<AuditMessage> auditMessageQueue = new ArrayBlockingQueue<>(1000);
    private final ExecutorService executorService = Executors.newFixedThreadPool(10);
    @Autowired
    private List<YssAuditSubscriber> subscribers;
    @Autowired
    private AuditConfigurationProperties auditConfigurationProperties;

    /**
     * Initialize the service and start the message processing.
     */
    @PostConstruct
    private void init() {
        for (int i = 0; i < 10; i++) {
            executorService.submit(this::doPublish);
        }
    }

    /**
     * Publish a new audit message.
     *
     * @param message audit message
     */
    public void publish(AuditMessage message) {
        if (auditConfigurationProperties.getEnabled()) {
            if (!auditMessageQueue.offer(message)) {
                log.error("Publish audit message failed, message:{}", message);
            }
        }
    }

    /**
     * Execute the message processor for each subscriber.
     */
    private void doPublish() {
        while (true) {
            try {
                AuditMessage message = auditMessageQueue.take();
                for (YssAuditSubscriber subscriber : subscribers) {
                    try {
                        subscriber.execute(message);
                    } catch (Exception e) {
                        log.error("Consume audit message failed, message:{}", message, e);
                    }
                }
            } catch (InterruptedException e) {
                log.error("Consume audit message failed", e);
                Thread.currentThread().interrupt();
                break;
            }
        }
    }
}
