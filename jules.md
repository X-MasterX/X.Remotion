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

## 5. Kinh nghiệm "Xương Máu" khi làm việc với Remotion & Video Dài (Thực chiến Sandbox)
Dưới đây là những bài học sinh tồn được rút ra từ những đêm dài ngồi đợi render, dành cho các thế hệ Jules tương lai:

1.  **Lỗi `remotion: command not found` trong Monorepo:**
    Dự án sử dụng kiến trúc Turborepo. Đôi khi biến môi trường không nhận dạng được lệnh `remotion` toàn cục.
    *Giải pháp:* Nếu bị lỗi, hãy đảm bảo bạn đã build các packages trước bằng lệnh `bun run build`. Sau đó, trong `package.json`, gọi trực tiếp executable cục bộ: `node_modules/.bin/remotion render ...`.

2.  **Bẫy Timeout khi Render Video Dài (VD: Video 5 phút):**
    Render một video 5 phút ở 30FPS (~9000 frames) đòi hỏi kết xuất bằng Chromium Headless và sẽ tốn khoảng 20-30 phút tùy cấu hình. Lệnh bash thông thường sẽ bị timeout sau 400 giây.
    *Giải pháp:* Luôn chạy tiến trình render ở background và redirect output ra file log:
    `node_modules/.bin/remotion render ... > build.log 2>&1 &`
    Sau đó, bạn có thể kiểm tra tiến độ bằng lệnh `tail build.log` thay vì treo terminal chờ đợi vô vọng.

3.  **Tuyệt đối ĐỒNG BỘ TTS & JSON:**
    Đây là lỗi chí mạng! Khi sửa đổi nội dung text của file `data/lesson.json`, bạn BẮT BUỘC phải chạy lại script `bun run scripts/pre-render-tts.ts`.
    *Lý do:* Component Remotion (`src/Root.tsx`) phụ thuộc hoàn toàn vào trường `durationInSeconds` do script sinh ra. Nếu sửa tay JSON mà không chạy script, giá trị này sẽ là `undefined`, dẫn đến lỗi tính toán độ dài frame (`NaN`) và làm crash toàn bộ quá trình render.

4.  **Tham vọng Concurrency (Giới hạn CPU):**
    Đừng tham lam thêm flag `--concurrency=10` để ép máy render nhanh hơn. Sandbox thường chỉ giới hạn 4 cores. Nếu ép quá giới hạn, tiến trình Remotion sẽ bị crash ngay lập tức (`Error: concurrency is set higher than the amount of CPU cores available`). Cứ để mặc định, máy sẽ tự động nhận diện tài nguyên tốt nhất.
