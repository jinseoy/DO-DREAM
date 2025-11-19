package A704.DODREAM.fcm.dto;

import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class FcmSendRequest {
	private List<Long> userIds;
	private String title;
	private String body;
}
