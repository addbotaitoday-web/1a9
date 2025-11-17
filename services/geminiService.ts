import { GoogleGenAI, Type } from "@google/genai";
import type { GradingResult, Exercise, GradedSubProblem } from '../types';

// Fix: Adhere to @google/genai guidelines for API key management.
// The API key must be obtained from process.env.API_KEY, which resolves the TypeScript error.
if (!process.env.API_KEY) {
  throw new Error("API_KEY is not set in environment variables.");
}
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = (error) => reject(error);
  });
};

export const gradeStudentWork = async (
  examImages: File[],
  studentWorkImages: File[]
): Promise<Exercise[]> => {
  const base64ExamImages = await Promise.all(examImages.map(fileToBase64));
  const base64StudentImages = await Promise.all(studentWorkImages.map(fileToBase64));

  const examImageParts = examImages.map((file, index) => ({
    inlineData: {
      mimeType: file.type,
      data: base64ExamImages[index],
    },
  }));

  const studentImageParts = studentWorkImages.map((file, index) => ({
    inlineData: {
      mimeType: file.type,
      data: base64StudentImages[index],
    },
  }));

  const prompt = `Bạn là một trợ lý giáo viên AI chuyên chấm bài tập toán cho học sinh tiểu học, được lập trình với mục tiêu đạt ĐỘ CHÍNH XÁC TUYỆT ĐỐI.

**CHÍNH SÁCH KHÔNG KHOAN NHƯỢNG VỚI LỖI:**
Bất kỳ sai sót nào trong việc nhận dạng chữ số viết tay (ví dụ: đọc nhầm số '3' thành '8', '1' thành '7') đều là lỗi nghiêm trọng và không thể chấp nhận. Độ chính xác là ưu tiên hàng đầu.

**THỬ THÁCH LỚN NHẤT: CHỮ VIẾT TAY CỦA HỌC SINH**
Chữ viết tay của trẻ em thường không rõ ràng và dễ gây nhầm lẫn. Để giải quyết vấn đề này, bạn BẮT BUỘC phải thực hiện "kiểm tra logic toán học":
- Sau khi nhận dạng một con số trong bài làm, hãy tự hỏi: "Con số này có hợp lý với bài toán không?"
- Ví dụ: Nếu bài toán là "10 - 3 = ?", và học sinh viết một số trông giống cả số '1' và số '7', bạn phải suy luận rằng đáp án đúng là '7' và diễn giải chữ viết tay đó là số '7'.
- Luôn ưu tiên diễn giải một con số sao cho nó trở thành đáp án đúng nếu có sự không rõ ràng trong nét chữ.

**QUY TRÌNH LÀM VIỆC NGHIÊM NGẶT:**

1.  **Phân tích ĐỀ BÀI GỐC:**
    *   Đọc và hiểu tất cả các câu hỏi, xác định các bài tập lớn (ví dụ: "Bài 1", "Bài 2").
    *   Trong mỗi bài tập, xác định từng câu hỏi nhỏ và tự giải để tìm ra đáp án chính xác.

2.  **Phân tích BÀI LÀM CỦA HỌC SINH (BƯỚC QUAN TRỌNG NHẤT):**
    *   Đối chiếu bài làm với đề bài.
    *   Với mỗi câu trả lời, hãy áp dụng kỹ thuật phân tích hình ảnh tiên tiến nhất để đọc chữ số viết tay.
    *   **Thực hiện "kiểm tra logic toán học" như đã mô tả ở trên.**
    *   Trong phần 'feedback', câu đầu tiên BẮT BUỘC phải là: "AI đọc được câu trả lời là: [số học sinh viết]." Sau đó mới đưa ra nhận xét. Ví dụ: "AI đọc được câu trả lời là: 7. Đáp án đúng là 7. Chính xác." hoặc "AI đọc được câu trả lời là: 6. Đáp án đúng là 7. Sai." Điều này cực kỳ quan trọng để giáo viên có thể xác thực.

3.  **Đánh giá và cho điểm:**
    *   So sánh câu trả lời đã nhận dạng của học sinh với đáp án đúng.
    *   Gán 'studentScore' là 1 nếu đúng, 0 nếu sai.
    *   Viết nhận xét ngắn gọn, mang tính xây dựng cho MỖI câu hỏi con, tuân thủ định dạng đã nêu ở bước 2.

**ĐỊNH DẠNG ĐẦU RA (JSON):**

Chỉ trả về một mảng JSON. Mỗi đối tượng trong mảng đại diện cho một BÀI TẬP LỚN và phải có cấu trúc:
- 'id': Số thứ tự của bài tập lớn (bắt đầu từ 0).
- 'title': Tiêu đề của bài tập (ví dụ: "Bài 1").
- 'problems': Một mảng các đối tượng câu hỏi con, mỗi đối tượng chứa:
    - 'id': Số thứ tự của câu hỏi con (bắt đầu từ 0).
    - 'text': Nội dung câu hỏi con.
    - 'solution': Đáp án đúng của câu hỏi con.
    - 'studentScore': Điểm của câu hỏi con (1 cho đúng, 0 cho sai).
    - 'feedback': Lời nhận xét (Bắt buộc tuân thủ quy tắc ở bước 2).

**LƯU Ý:** Không được tính tổng điểm. Chỉ trả về mảng JSON theo cấu trúc đã quy định.`;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-pro",
    contents: {
      parts: [
        { text: prompt },
        { text: "--- BẮT ĐẦU ẢNH ĐỀ BÀI GỐC ---" },
        ...examImageParts,
        { text: "--- KẾT THÚC ẢNH ĐỀ BÀI GỐC ---" },
        { text: "--- BẮT ĐẦU ẢNH BÀI LÀM CỦA HỌC SINH ---" },
        ...studentImageParts,
        { text: "--- KẾT THÚC ẢNH BÀI LÀM CỦA HỌC SINH ---" },
      ],
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.NUMBER },
            title: { type: Type.STRING },
            problems: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.NUMBER },
                  text: { type: Type.STRING },
                  solution: { type: Type.STRING },
                  studentScore: { type: Type.NUMBER },
                  feedback: { type: Type.STRING }
                },
                required: ["id", "text", "solution", "studentScore", "feedback"]
              }
            }
          },
          required: ["id", "title", "problems"]
        }
      }
    }
  });

  try {
    const parsedExercises: Exercise[] = JSON.parse(response.text);
    // Sort exercises and problems by ID for consistency
    parsedExercises.sort((a, b) => a.id - b.id);
    parsedExercises.forEach(ex => {
        if (ex.problems) {
            ex.problems.sort((a: GradedSubProblem, b: GradedSubProblem) => a.id - b.id);
        }
    });
    return parsedExercises;
  } catch (e) {
    console.error("Lỗi phân tích JSON từ Gemini khi chấm bài:", e);
    throw new Error("AI đã trả về một định dạng không hợp lệ khi chấm bài.");
  }
};
