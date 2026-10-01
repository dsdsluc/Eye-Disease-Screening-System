import type { DiseaseLabel } from "@/lib/multidisease";

/** Plain-language education copy shown in DiseaseInfoDialog when a tile in
 * ProbabilityGrid is clicked. General knowledge only -- not tailored to
 * this specific scan, and deliberately not phrased as "you have X" (see
 * plans/plan_multidisease.txt section 6 on the single-label caveat this
 * whole feature already carries). Two sections per entry, not one long
 * paragraph: "characteristics" (what it is) and "signs / when to see a
 * doctor" (actionable, not diagnostic). */
export type DiseaseExplanation = {
  sections: { title: string; points: string[] }[];
};

export const DISEASE_EXPLANATIONS: Record<DiseaseLabel, DiseaseExplanation> = {
  normal: {
    sections: [
      {
        title: "Đặc điểm",
        points: [
          "Mô hình không thấy tín hiệu rõ rệt của 7 nhóm bệnh còn lại trong ảnh này.",
          "Đây KHÔNG phải kết luận \"mắt hoàn toàn khỏe mạnh\" -- chỉ phản ánh riêng ảnh chụp này.",
          "Độ chính xác tổng thể của mô hình hiện chỉ khoảng 62%, nên kết quả mang tính tham khảo.",
        ],
      },
      {
        title: "Vẫn nên lưu ý",
        points: [
          "Khám mắt định kỳ, đặc biệt nếu có bệnh nền như tiểu đường hoặc cao huyết áp.",
          "Đi khám ngay nếu có triệu chứng bất thường về thị lực, dù kết quả sàng lọc là bình thường.",
        ],
      },
    ],
  },
  diabetes: {
    sections: [
      {
        title: "Đặc điểm",
        points: [
          "Tổn thương xảy ra ở các mạch máu nhỏ nuôi võng mạc, thường liên quan đến bệnh tiểu đường kéo dài.",
          "Mạch máu có thể phình, rò rỉ dịch hoặc máu, hoặc mọc mạch bất thường ở giai đoạn nặng.",
          "Là một trong những nguyên nhân hàng đầu gây giảm thị lực ở người trưởng thành.",
        ],
      },
      {
        title: "Dấu hiệu & khi nào cần khám",
        points: [
          "Giai đoạn đầu thường KHÔNG có triệu chứng rõ rệt.",
          "Nhìn mờ, thấy đốm đen, hoặc khó nhìn màu có thể xuất hiện khi bệnh tiến triển.",
          "Người mắc tiểu đường nên khám mắt định kỳ mỗi năm, kể cả khi chưa có triệu chứng.",
        ],
      },
    ],
  },
  glaucoma: {
    sections: [
      {
        title: "Đặc điểm",
        points: [
          "Áp lực trong mắt tăng cao, có thể làm tổn thương dây thần kinh thị giác theo thời gian.",
          "Tổn thương thường diễn tiến âm thầm, khó nhận biết ở giai đoạn sớm.",
          "Có thể liên quan đến yếu tố di truyền, tuổi tác, hoặc bệnh lý mắt khác.",
        ],
      },
      {
        title: "Dấu hiệu & khi nào cần khám",
        points: [
          "Mất thị lực ngoại vi (nhìn \"đường hầm\") thường là dấu hiệu muộn.",
          "Đau nhức mắt hoặc thấy quầng sáng quanh đèn có thể là dấu hiệu cấp tính -- cần khám ngay.",
          "Đo nhãn áp định kỳ là cách phát hiện sớm hiệu quả nhất.",
        ],
      },
    ],
  },
  cataract: {
    sections: [
      {
        title: "Đặc điểm",
        points: [
          "Thủy tinh thể (thấu kính tự nhiên của mắt) bị mờ đục dần theo thời gian.",
          "Thường liên quan đến lão hóa, nhưng cũng có thể do chấn thương hoặc bệnh lý khác.",
          "Là nguyên nhân phổ biến gây giảm thị lực có thể điều trị được bằng phẫu thuật.",
        ],
      },
      {
        title: "Dấu hiệu & khi nào cần khám",
        points: [
          "Nhìn mờ như qua lớp sương, chói mắt khi nhìn đèn hoặc ánh sáng mạnh.",
          "Màu sắc trông nhạt hơn, khó nhìn rõ vào ban đêm.",
          "Nên khám mắt nếu các triệu chứng bắt đầu ảnh hưởng đến sinh hoạt hàng ngày.",
        ],
      },
    ],
  },
  amd: {
    sections: [
      {
        title: "Đặc điểm",
        points: [
          "Vùng điểm vàng (trung tâm võng mạc, chịu trách nhiệm nhìn chi tiết) bị thoái hóa dần.",
          "Thường gặp ở người trên 50 tuổi.",
          "Có hai dạng: khô (tiến triển chậm) và ướt (tiến triển nhanh, cần điều trị sớm).",
        ],
      },
      {
        title: "Dấu hiệu & khi nào cần khám",
        points: [
          "Nhìn hình ảnh bị méo, đường thẳng trông cong.",
          "Xuất hiện điểm mờ hoặc tối ở trung tâm tầm nhìn.",
          "Nên khám ngay nếu triệu chứng xuất hiện đột ngột, đặc biệt nghi ngờ dạng ướt.",
        ],
      },
    ],
  },
  hypertension: {
    sections: [
      {
        title: "Đặc điểm",
        points: [
          "Huyết áp cao kéo dài có thể làm hẹp và tổn thương mạch máu võng mạc.",
          "Mức độ tổn thương thường phản ánh thời gian và mức độ kiểm soát huyết áp.",
          "Có thể đi kèm các biến chứng tim mạch khác.",
        ],
      },
      {
        title: "Dấu hiệu & khi nào cần khám",
        points: [
          "Thường không có triệu chứng ở giai đoạn nhẹ.",
          "Nhìn mờ đột ngột có thể là dấu hiệu huyết áp tăng cao cấp tính -- cần đi khám ngay.",
          "Kiểm soát huyết áp tốt là cách phòng ngừa hiệu quả nhất.",
        ],
      },
    ],
  },
  myopia: {
    sections: [
      {
        title: "Đặc điểm",
        points: [
          "Trục nhãn cầu dài quá mức khiến ảnh hội tụ trước võng mạc, gây nhìn xa mờ.",
          "Cận thị bệnh lý là mức độ nặng, có thể kèm biến đổi cấu trúc võng mạc.",
          "Có thể làm tăng nguy cơ bong võng mạc hoặc thoái hóa điểm vàng do cận thị.",
        ],
      },
      {
        title: "Dấu hiệu & khi nào cần khám",
        points: [
          "Nhìn xa mờ, phải nheo mắt hoặc đến gần để nhìn rõ.",
          "Thấy chớp sáng hoặc ruồi bay tăng bất thường -- cần khám ngay (nguy cơ bong võng mạc).",
          "Nên đo khúc xạ định kỳ để cập nhật kính phù hợp.",
        ],
      },
    ],
  },
  other: {
    sections: [
      {
        title: "Đặc điểm",
        points: [
          "Nhóm \"khác\" gộp các tín hiệu không thuộc rõ ràng vào 7 nhóm còn lại.",
          "Có thể là bệnh lý mắt ít gặp hơn, hoặc đặc điểm ảnh không điển hình.",
          "Không nên coi đây là kết luận cụ thể về một bệnh lý nào.",
        ],
      },
      {
        title: "Khi nào cần khám",
        points: [
          "Nếu nhóm này có xác suất cao, nên trao đổi với bác sĩ chuyên khoa để đánh giá kỹ hơn.",
          "Không có bộ dấu hiệu chung cho nhóm này do đây là nhóm gộp nhiều khả năng khác nhau.",
        ],
      },
    ],
  },
};
