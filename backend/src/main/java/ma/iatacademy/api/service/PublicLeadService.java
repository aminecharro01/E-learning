package ma.iatacademy.api.service;

import lombok.RequiredArgsConstructor;
import ma.iatacademy.api.domain.entity.ContactMessage;
import ma.iatacademy.api.domain.entity.NewsletterSubscriber;
import ma.iatacademy.api.dto.MessageResponse;
import ma.iatacademy.api.dto.admin.ContactMessageResponse;
import ma.iatacademy.api.dto.admin.NewsletterSubscriberResponse;
import ma.iatacademy.api.dto.common.PageResponse;
import ma.iatacademy.api.dto.publicapi.ContactRequest;
import ma.iatacademy.api.dto.publicapi.NewsletterSubscribeRequest;
import ma.iatacademy.api.exception.NotFoundException;
import ma.iatacademy.api.repository.ContactMessageRepository;
import ma.iatacademy.api.repository.NewsletterSubscriberRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class PublicLeadService {

    private final ContactMessageRepository contactMessageRepository;
    private final NewsletterSubscriberRepository newsletterSubscriberRepository;

    @Transactional
    public MessageResponse submitContact(ContactRequest request) {
        ContactMessage msg = new ContactMessage();
        msg.setFirstName(request.firstName().trim());
        msg.setLastName(request.lastName().trim());
        msg.setEmail(request.email().trim().toLowerCase());
        msg.setPhone(request.phone().trim());
        msg.setMessage(request.message().trim());
        msg.setStatus("NEW");
        contactMessageRepository.save(msg);
        return new MessageResponse("Message envoyé. L'académie vous recontactera bientôt.");
    }

    @Transactional
    public MessageResponse subscribeNewsletter(NewsletterSubscribeRequest request) {
        String email = request.email().trim().toLowerCase();
        NewsletterSubscriber existing = newsletterSubscriberRepository.findByEmailIgnoreCase(email).orElse(null);
        if (existing != null) {
            if (!existing.isActive()) {
                existing.setActive(true);
                newsletterSubscriberRepository.save(existing);
            }
            return new MessageResponse("Vous êtes déjà inscrit à la newsletter.");
        }
        NewsletterSubscriber sub = new NewsletterSubscriber();
        sub.setEmail(email);
        sub.setActive(true);
        newsletterSubscriberRepository.save(sub);
        return new MessageResponse("Inscription enregistrée. Merci !");
    }

    @Transactional(readOnly = true)
    public PageResponse<ContactMessageResponse> listContactMessages(int page, int size, String q, String status) {
        Pageable pageable = PageRequest.of(
                Math.max(page, 0),
                Math.min(Math.max(size, 1), 100),
                Sort.by(Sort.Direction.DESC, "createdAt")
        );
        String needle = q == null || q.isBlank() ? null : q.trim();
        String statusFilter = status == null || status.isBlank() ? null : status.trim().toUpperCase();
        return PageResponse.from(
                contactMessageRepository.search(needle, statusFilter, pageable).map(this::toContactResponse)
        );
    }

    @Transactional
    public ContactMessageResponse updateContactStatus(UUID id, String status) {
        ContactMessage msg = contactMessageRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Message introuvable."));
        msg.setStatus(status.trim().toUpperCase());
        return toContactResponse(contactMessageRepository.save(msg));
    }

    @Transactional
    public MessageResponse bulkUpdateContactStatus(java.util.List<UUID> ids, String status) {
        String normalized = status.trim().toUpperCase();
        int updated = 0;
        for (UUID id : ids) {
            ContactMessage msg = contactMessageRepository.findById(id).orElse(null);
            if (msg == null) {
                continue;
            }
            msg.setStatus(normalized);
            updated++;
        }
        return new MessageResponse(updated + " message(s) mis à jour.");
    }

    @Transactional
    public MessageResponse deleteContact(UUID id) {
        if (!contactMessageRepository.existsById(id)) {
            throw new NotFoundException("Message introuvable.");
        }
        contactMessageRepository.deleteById(id);
        return new MessageResponse("Message supprimé.");
    }

    @Transactional(readOnly = true)
    public PageResponse<NewsletterSubscriberResponse> listNewsletterSubscribers(
            int page, int size, String q, Boolean active
    ) {
        Pageable pageable = PageRequest.of(
                Math.max(page, 0),
                Math.min(Math.max(size, 1), 100),
                Sort.by(Sort.Direction.DESC, "createdAt")
        );
        String needle = q == null || q.isBlank() ? null : q.trim();
        return PageResponse.from(
                newsletterSubscriberRepository.search(needle, active, pageable).map(this::toNewsletterResponse)
        );
    }

    @Transactional
    public NewsletterSubscriberResponse setNewsletterActive(UUID id, boolean active) {
        NewsletterSubscriber sub = newsletterSubscriberRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Abonné introuvable."));
        sub.setActive(active);
        return toNewsletterResponse(newsletterSubscriberRepository.save(sub));
    }

    @Transactional
    public MessageResponse deleteNewsletter(UUID id) {
        if (!newsletterSubscriberRepository.existsById(id)) {
            throw new NotFoundException("Abonné introuvable.");
        }
        newsletterSubscriberRepository.deleteById(id);
        return new MessageResponse("Abonné supprimé.");
    }

    @Transactional(readOnly = true)
    public long countNewContactMessages() {
        return contactMessageRepository.countByStatus("NEW");
    }

    @Transactional(readOnly = true)
    public long countActiveNewsletter() {
        return newsletterSubscriberRepository.countByActiveTrue();
    }

    private ContactMessageResponse toContactResponse(ContactMessage c) {
        return new ContactMessageResponse(
                c.getId(),
                c.getFirstName(),
                c.getLastName(),
                c.getEmail(),
                c.getPhone(),
                c.getMessage(),
                c.getStatus(),
                c.getCreatedAt()
        );
    }

    private NewsletterSubscriberResponse toNewsletterResponse(NewsletterSubscriber n) {
        return new NewsletterSubscriberResponse(
                n.getId(),
                n.getEmail(),
                n.isActive(),
                n.getCreatedAt()
        );
    }
}
