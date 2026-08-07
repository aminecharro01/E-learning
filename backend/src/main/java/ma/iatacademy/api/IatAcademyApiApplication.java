package ma.iatacademy.api;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * EnableScheduling : flush périodique du tracking temps (Redis -> Postgres) et rappels
 * de sessions live. EnableAsync : envoi de campagnes email en tâche de fond.
 */
@SpringBootApplication
@EnableScheduling
@EnableAsync
public class IatAcademyApiApplication {

    public static void main(String[] args) {
        SpringApplication.run(IatAcademyApiApplication.class, args);
    }
}
