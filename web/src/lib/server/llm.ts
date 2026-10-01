import "server-only";
import OpenAI from "openai";

// Direct port of the old inference/llm.py -- the LLM only phrases/explains
// fixed clinical facts, it never invents thresholds or a treatment plan.
// CLINICAL_GUIDANCE is the deterministic source of truth for grade ->
// severity label / follow-up interval, not the model's judgement.
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const MODEL = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

export const CLINICAL_GUIDANCE: Record<number, { label: string; followUp: string }> = {
  0: {
    label: "Không có dấu hiệu bệnh võng mạc tiểu đường (No DR)",
    followUp: "Tái khám định kỳ hàng năm theo lịch tầm soát tiểu đường thông thường.",
  },
  1: {
    label: "Bệnh võng mạc tiểu đường mức độ nhẹ (Mild NPDR)",
    followUp: "Tái khám sau 9-12 tháng để theo dõi tiến triển.",
  },
  2: {
    label: "Bệnh võng mạc tiểu đường mức độ trung bình (Moderate NPDR)",
    followUp: "Tái khám sau 6 tháng; cân nhắc hội chẩn chuyên khoa mắt.",
  },
  3: {
    label: "Bệnh võng mạc tiểu đường mức độ nặng (Severe NPDR)",
    followUp: "Cần khám chuyên khoa mắt trong vòng 1-3 tháng.",
  },
  4: {
    label: "Bệnh võng mạc tăng sinh (Proliferative DR)",
    followUp: "Cần khám chuyên khoa mắt KHẨN, nguy cơ mất thị lực nếu trì hoãn.",
  },
};

export const DISCLAIMER =
  "Đây là kết quả từ công cụ hỗ trợ bằng AI, CHỈ mang tính chất tham khảo, " +
  "không thay thế chẩn đoán và quyết định điều trị của bác sĩ chuyên khoa.";

const REPORT_SCHEMA = {
  type: "json_schema" as const,
  json_schema: {
    name: "dr_report",
    schema: {
      type: "object",
      properties: {
        summary: {
          type: "string",
          description: "Tóm tắt ngắn gọn kết quả bằng tiếng Việt, 2-3 câu",
        },
        attention_points: {
          type: "array",
          items: { type: "string" },
          description:
            "Những điểm bác sĩ nên chú ý khi tự đọc lại ảnh, dựa trên mức độ đồng thuận/lệch giữa các model trong ensemble",
        },
      },
      required: ["summary", "attention_points"],
      additionalProperties: false,
    },
    strict: true,
  },
};

export type GeneratedReport = {
  grade: number;
  label: string;
  followUp: string;
  summary: string;
  attentionPoints: string[];
  disclaimer: string;
};

export async function generateReport(result: {
  grade: number;
  score: number;
  backboneScores: Record<string, number>;
}): Promise<GeneratedReport> {
  const guidance = CLINICAL_GUIDANCE[result.grade];
  const values = Object.values(result.backboneScores);
  const spread = Math.max(...values) - Math.min(...values);

  const prompt = `Bạn là trợ lý diễn giải kết quả cho một hệ thống hỗ trợ chấm điểm mức độ
bệnh võng mạc tiểu đường (thang 0-4) từ ảnh đáy mắt, dùng ensemble 20 lượt phân tích AI
độc lập.

Kết quả:
- Mức độ (grade): ${result.grade} - ${guidance.label}
- Điểm ensemble liên tục: ${result.score.toFixed(3)}
- Độ đồng thuận giữa 20 lượt phân tích (chênh lệch điểm cao nhất - thấp nhất): ${spread.toFixed(3)}
  (0 = đồng thuận tuyệt đối, số càng lớn càng ít đồng thuận)

CHỈ diễn giải các số liệu trên bằng tiếng Việt tự nhiên, cho người đọc KHÔNG có nền tảng kỹ
thuật AI/ML (bệnh nhân hoặc bác sĩ lâm sàng). KHÔNG nhắc tên bất kỳ model/kiến trúc AI cụ
thể nào (không có tên kỹ thuật nào trong kết quả để bạn nhắc tới) -- chỉ nói "hệ thống" hoặc
"20 lượt phân tích". KHÔNG tự đưa ra ngưỡng hay phác đồ điều trị mới ngoài những gì đã cho.
KHÔNG tự chẩn đoán thêm bệnh nào khác ngoài dữ liệu được cung cấp. Nếu độ đồng thuận thấp
(chênh lệch > 0.5), hãy nêu rõ đây là ca có sự không thống nhất giữa các lượt phân tích, cần
bác sĩ xem xét kỹ hơn.`;

  const response = await client.chat.completions.create({
    model: MODEL,
    messages: [{ role: "user", content: prompt }],
    response_format: REPORT_SCHEMA,
  });

  const content = response.choices[0].message.content;
  if (!content) throw new Error("OpenAI trả về nội dung rỗng");
  const llmOutput = JSON.parse(content) as { summary: string; attention_points: string[] };

  return {
    grade: result.grade,
    label: guidance.label,
    followUp: guidance.followUp,
    summary: llmOutput.summary,
    attentionPoints: llmOutput.attention_points,
    disclaimer: DISCLAIMER,
  };
}

const CLINICAL_EXPLANATION_SCHEMA = {
  type: "json_schema" as const,
  json_schema: {
    name: "clinical_explanation",
    schema: {
      type: "object",
      properties: {
        findings: {
          type: "array",
          items: { type: "string" },
          description:
            "Từng quan sát riêng biệt về vùng ảnh mà AI tập trung chú ý (vùng màu ấm/đỏ trên bản đồ nhiệt) -- " +
            "nêu vị trí tương đối (vd: góc trên thái dương, quanh hoàng điểm, cạnh đĩa thị) và loại tổn thương " +
            "PHÙ HỢP về mặt thị giác với vùng đó (vd: vi phình mạch, xuất huyết dạng chấm, xuất tiết cứng), " +
            "luôn diễn đạt như một khả năng cần bác sĩ xác minh, không khẳng định chắc chắn.",
        },
        reasoning: {
          type: "string",
          description:
            "Đoạn văn 3-5 câu kết nối vùng AI chú ý với mức độ (grade) đã chấm -- vì sao các vùng này " +
            "phù hợp với mức độ đó, viết cho bác sĩ đọc lại ảnh nhanh hơn, không phải bệnh nhân.",
        },
      },
      required: ["findings", "reasoning"],
      additionalProperties: false,
    },
    strict: true,
  },
};

export type ClinicalExplanation = {
  findings: string[];
  reasoning: string;
  disclaimer: string;
};

/**
 * Doctor-only, vision-grounded -- unlike generateReport (numbers only, never
 * sees the image), this looks at the actual Grad-CAM heatmap so it can talk
 * about *where* the AI's attention concentrated. Still bound by the same
 * principle as the rest of this file: describe, don't diagnose -- every
 * finding is phrased as a visual possibility for the doctor to verify, not
 * a confirmed pathology.
 */
export async function generateClinicalExplanation(input: {
  heatmapDataUri: string;
  grade: number;
  score: number;
  backboneScores: Record<string, number>;
}): Promise<ClinicalExplanation> {
  const guidance = CLINICAL_GUIDANCE[input.grade];
  const values = Object.values(input.backboneScores);
  const spread = Math.max(...values) - Math.min(...values);

  const prompt = `Bạn là trợ lý hỗ trợ bác sĩ nhãn khoa đọc lại ảnh đáy mắt trong một hệ thống sàng lọc
bệnh võng mạc tiểu đường bằng AI. Ảnh đính kèm là bản đồ nhiệt Grad-CAM: vùng màu ấm/đỏ là nơi
mô hình AI tập trung chú ý nhiều nhất khi ra quyết định, chồng lên ảnh đáy mắt gốc.

Kết quả AI đã chấm:
- Mức độ (grade): ${input.grade} - ${guidance.label}
- Điểm ensemble liên tục: ${input.score.toFixed(3)}
- Độ chênh lệch giữa các kiến trúc: ${spread.toFixed(3)}

Nhiệm vụ: nhìn vào vùng màu ấm/đỏ trên bản đồ nhiệt, mô tả vị trí tương đối của các vùng đó
trên ảnh đáy mắt (vd: góc trên thái dương, quanh hoàng điểm, cạnh đĩa thị, góc dưới mũi...),
và loại tổn thương võng mạc tiểu đường PHÙ HỢP về mặt thị giác với hình dạng/vị trí vùng đó
(vi phình mạch, xuất huyết dạng chấm hoặc vệt, xuất tiết cứng, phù hoàng điểm, tân mạch hoá...).

BẮT BUỘC: luôn diễn đạt mỗi quan sát như một khả năng cần bác sĩ tự xác minh lại trên ảnh gốc
(dùng "có thể", "gợi ý khả năng", "cần đối chiếu"...) -- KHÔNG khẳng định chắc chắn đây là tổn
thương gì. KHÔNG chẩn đoán bệnh nào ngoài phạm vi bệnh võng mạc tiểu đường. KHÔNG đề xuất phác
đồ điều trị. Nếu vùng chú ý phân tán không rõ ràng hoặc không có gì bất thường đáng chú ý (vd:
mức độ 0), hãy nói rõ điều đó thay vì cố suy diễn tổn thương.`;

  const response = await client.chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: prompt },
          { type: "image_url", image_url: { url: input.heatmapDataUri } },
        ],
      },
    ],
    response_format: CLINICAL_EXPLANATION_SCHEMA,
  });

  const content = response.choices[0].message.content;
  if (!content) throw new Error("OpenAI trả về nội dung rỗng");
  const llmOutput = JSON.parse(content) as { findings: string[]; reasoning: string };

  return {
    findings: llmOutput.findings,
    reasoning: llmOutput.reasoning,
    disclaimer:
      "Đây là suy luận thị giác của AI dựa trên bản đồ nhiệt, CHỈ mang tính gợi ý hỗ trợ đọc ảnh -- " +
      "không phải chẩn đoán xác định. Bác sĩ cần tự đối chiếu trực tiếp trên ảnh gốc trước khi kết luận.",
  };
}
