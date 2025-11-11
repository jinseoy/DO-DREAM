package A704.DODREAM.file.service;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
public class FileStorageService {

	private final Path uploadPath;
	private final Path tempPath;

	public FileStorageService(
		@Value("${file.upload.dir}") String uploadDir,
		@Value("${file.upload.temp-dir}") String tempDir) throws IOException {
		this.uploadPath = Paths.get(uploadDir).toAbsolutePath().normalize();
		this.tempPath = Paths.get(tempDir).toAbsolutePath().normalize();

		// 디렉토리 생성
		Files.createDirectories(this.uploadPath);
		Files.createDirectories(this.tempPath);

		log.info("File upload directory: {}", this.uploadPath);
		log.info("File temp directory: {}", this.tempPath);
	}

	/**
	 * PDF 파일 저장
	 */
	public String storeFile(MultipartFile file) throws IOException {
		String originalFileName = file.getOriginalFilename();
		String fileExtension = originalFileName.substring(originalFileName.lastIndexOf("."));
		String storedFileName = UUID.randomUUID() + fileExtension;

		Path targetLocation = this.uploadPath.resolve(storedFileName);
		Files.copy(file.getInputStream(), targetLocation, StandardCopyOption.REPLACE_EXISTING);

		log.info("File stored: {} -> {}", originalFileName, storedFileName);
		return storedFileName;
	}

	/**
	 * 임시 파일 저장 (이미지 변환 중간 파일)
	 */
	public File saveTempFile(byte[] imageData, String prefix, String extension) throws IOException {
		String fileName = prefix + "_" + UUID.randomUUID() + "." + extension;
		Path tempFilePath = this.tempPath.resolve(fileName);
		Files.write(tempFilePath, imageData);

		File tempFile = tempFilePath.toFile();
		tempFile.deleteOnExit(); // JVM 종료 시 자동 삭제

		return tempFile;
	}

	/**
	 * 파일 경로 가져오기
	 */
	public Path getFilePath(String fileName) {
		return this.uploadPath.resolve(fileName).normalize();
	}

	/**
	 * 파일 삭제
	 */
	public void deleteFile(String fileName) throws IOException {
		Path filePath = this.uploadPath.resolve(fileName).normalize();
		Files.deleteIfExists(filePath);
		log.info("File deleted: {}", fileName);
	}

	/**
	 * 임시 파일 삭제
	 */
	public void deleteTempFile(File file) {
		if (file != null && file.exists()) {
			boolean deleted = file.delete();
			if (deleted) {
				log.debug("Temp file deleted: {}", file.getName());
			}
		}
	}

	/**
	 * 파일 크기 검증
	 */
	public boolean isValidFileSize(MultipartFile file, long maxSizeInBytes) {
		return file.getSize() <= maxSizeInBytes;
	}

	/**
	 * PDF 파일 확장자 검증
	 */
	public boolean isPdfFile(MultipartFile file) {
		String originalFileName = file.getOriginalFilename();
		if (originalFileName == null) {
			return false;
		}
		return originalFileName.toLowerCase().endsWith(".pdf");
	}
}