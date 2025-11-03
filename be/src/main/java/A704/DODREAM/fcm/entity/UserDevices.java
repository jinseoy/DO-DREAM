package A704.DODREAM.fcm.entity;

import A704.DODREAM.fcm.enums.DeviceType;
import A704.DODREAM.user.entity.User;
import jakarta.persistence.*;
import lombok.*;
import org.checkerframework.checker.units.qual.N;

import java.time.LocalDateTime;

@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserDevices {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(length = 500, nullable = false, unique = true)
    private String fcmToken;

    @Enumerated(EnumType.STRING)
    private DeviceType deviceType;

    @Column(nullable = false)
    private LocalDateTime registeredAt;

    private LocalDateTime lastUsedAt;

    @Column(nullable = false)
    private boolean isActive;
}
