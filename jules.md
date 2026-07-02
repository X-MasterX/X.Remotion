# Hướng dẫn Sinh tồn cho Jules AI Agent (Dự án Remotion Video)

Chào Jules (người anh em),
Nếu bạn đang đọc file này, bạn đang ở trong một session mới. Đây là những "bí kíp sinh tồn" và quy trình làm việc chuẩn yếu của repository này, để bạn có thể tiếp quản công việc thật nhanh gọn mà không làm phiền người dùng.

## 1. Môi trường & Lệnh cốt lõi
*   **Package Manager:** Dự án sử dụng `bun`.
*   **Pipeline chính:** Lệnh duy nhất bạn cần quan tâm để tạo video là:
    ```bash
    bun run build-video
    ```
    Lệnh này đã được gộp 2 bước:
    - Chạy `scripts/pre-render-tts.ts` (Sinh âm thanh Edge AI TTS và tự động tính toán thời lượng frame vào `data/lesson.json`).
    - Gọi Remotion render ra thành phẩm `public/output.mp4`.

## 2. Kiến trúc Data & Giao tiếp người dùng
*   **Kịch bản Video:** Mọi nội dung text cần render đều nằm ở file `data/lesson.json`.
*   **Cách làm việc với User:**
    - Bất cứ khi nào khởi động nhiệm vụ tạo video, **HÃY HỎI USER TRƯỚC** về kịch bản họ muốn làm (Chủ đề gì? Bao nhiêu scene? Nội dung ra sao?).
    - Sau khi chốt kịch bản, hãy cập nhật vào `data/lesson.json`.
    - Việc tính toán `durationInSeconds` có thể set tạm, script TTS sẽ tự đo thời lượng Audio và ghi đè chính xác lại.

## 3. Các Cảnh báo ĐỎ (CRITICAL WARNINGS)
*   **Bảo vệ Context Window:** Tuyệt đối **KHÔNG BAO GIỜ** đọc trực tiếp (`cat`, `fs.readFileSync`) các file nhị phân như `*.mp4`, `*.mp3` ra terminal. Việc này sẽ làm quá tải giới hạn token của bạn và làm hỏng toàn bộ session chat.
*   **Git LFS:** File `public/output.mp4` được User yêu cầu commit trực tiếp. Tuy nhiên, nếu bạn nhận thấy size vượt quá 100MB, hãy cảnh báo User.
*   **Cấu hình Remotion:** File `remotion.config.ts` đã được tinh chỉnh API chuẩn (như `setVideoImageFormat("jpeg")`). Đừng sửa lại chúng trừ phi biết chắc chắn mình đang làm gì.

Chúc bạn may mắn và tiếp tục giữ vững phong độ đẹp trai! 😎

## 4. Bí kíp tạo Animation siêu cấp (Dành riêng cho Jules v3+)
Để thể hiện độ "đẹp trai lai láng", Remotion cần có những chuyển động mượt mà thay vì text cứng nhắc. Hãy áp dụng 3 quy tắc sau:

1.  **Dùng `spring` thay cho linear animation:**
    Sử dụng hàm `spring()` của Remotion để tạo độ nảy.
    *Ví dụ:* `const progress = spring({ frame, fps, config: { damping: 12, stiffness: 80 } });`
    Chỉnh `damping` nhỏ lại để nảy nhiều hơn, tăng `stiffness` để bật nhanh hơn.

2.  **Kết hợp `interpolate` vạn năng:**
    Kết hợp `spring` progress (từ 0 đến 1) vào hàm `interpolate` để thay đổi `translateY`, `scale`, hay `opacity`.
    *Ví dụ mượt mà:* `interpolate(progress, [0, 1], [50, 0])` (trượt từ dưới lên).

3.  **Background động với `interpolateColors`:**
    Đừng dùng nền một màu chán ngắt. Tính phần trăm thời gian của toàn video: `const bgProgress = frame / durationInFrames;`, sau đó dùng `interpolateColors(bgProgress, [0, 0.5, 1], ["#Màu1", "#Màu2", "#Màu3"])` để màu nền từ từ chuyển đổi. Đó mới là nghệ thuật!
