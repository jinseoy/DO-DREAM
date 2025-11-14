package A704.DODREAM.bookmark.service;

import A704.DODREAM.bookmark.dto.BookmarkRequest;
import A704.DODREAM.bookmark.dto.BookmarkResponse;
import A704.DODREAM.bookmark.entity.Bookmark;
import A704.DODREAM.bookmark.repository.BookmarkRepository;
import A704.DODREAM.global.exception.CustomException;
import A704.DODREAM.global.exception.constant.ErrorCode;
import A704.DODREAM.material.entity.Material;
import A704.DODREAM.material.repository.MaterialRepository;
import A704.DODREAM.user.entity.User;
import A704.DODREAM.user.repository.UserRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class BookmarkService {

    private final BookmarkRepository bookmarkRepository;
    private final MaterialRepository materialRepository;
    private final UserRepository userRepository;

    @Transactional
    public BookmarkResponse toggleBookmark(Long userId, BookmarkRequest request){

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));

        Material material = materialRepository.findById(request.getMaterialId())
                .orElseThrow(() -> new CustomException(ErrorCode.MATERIAL_NOT_FOUND));

        Optional<Bookmark> existing = bookmarkRepository.findByUserAndMaterialAndTitleIdAndSTitleId(user, material, request.getTitleId(), request.getStitleId());

        if(existing.isPresent()){
            bookmarkRepository.delete(existing.get());
            return BookmarkResponse.from(existing.get(), false);
        }
        else {
            Bookmark bookmark = Bookmark.builder()
                    .user(user)
                    .material(material)
                    .titleId(request.getTitleId())
                    .sTitleId(request.getStitleId())
                    .build();

            Bookmark saved = bookmarkRepository.save(bookmark);

            return BookmarkResponse.from(saved, true);
        }

    }
}
