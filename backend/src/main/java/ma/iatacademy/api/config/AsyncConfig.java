package ma.iatacademy.api.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

import java.util.concurrent.Executor;

/**
 * Pool dédié aux tâches @Async (envoi de campagnes email) — délibérément petit pour ne
 * pas saturer le SMTP ni le VPS ; ce n'est pas le pool HTTP de Tomcat.
 */
@Configuration
public class AsyncConfig {

    @Bean(name = "campaignTaskExecutor")
    public Executor campaignTaskExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(2);
        executor.setMaxPoolSize(4);
        executor.setQueueCapacity(50);
        executor.setThreadNamePrefix("campaign-async-");
        executor.initialize();
        return executor;
    }
}
