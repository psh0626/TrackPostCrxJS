fetch("https://service.epost.go.kr/trace.RetrieveEmsRigiTraceList.comm?POST_CODE=RK005034920KR&displayHeader=")
    .then((response) => response.text())
    .then((txt) => new DOMParser().parseFromString(txt, "text/html"))
    .then((e) => e.body.querySelector("table.detail_off > tbody"))
    .then((bd) =>
        console.log(
            [...bd.children].map((tr) =>
                [...tr.children].map((td) => td.textContent.replaceAll("\n", "").replaceAll("\t", "").trim()),
            ),
        ),
    );

interface Trace {
    deliveryDateAndTime: string;
    processState: string;
    processPlace: string;
    detailProcessState: string;
}
[
    [
        "2025.12.03 16:30",
        "접수",
        "서울용산우체국",
        "접수우체국우편번호 :04386     접수우체국전화번호 : 02-6966-0808     중계국 또는 도착국가 : 이탈리아(이태리)(IT)",
    ],
    ["2025.12.03 17:41", "발송", "서울용산우체국", ""],
    ["2025.12.03 18:55", "도착", "동서울우편집중국", ""],
    ["2025.12.03 20:39", "발송", "동서울우편집중국", ""],
    ["2025.12.03 22:00", "발송교환국에 도착", "국제우편물류센터", ""],
    ["2025.12.05 15:26", "운송사 인계", "INCHEON", "운송편 : KE927"],
    ["2025.12.05 14:07", "발송준비", "", "도착예정 교환국 : ITMILR 발송횟수 : 1065 운송편명 : KE927"],
    ["2025.12.06 09:55", "항공사 인수", "INCHEON", ""],
    ["2025.12.07 13:22", "항공기 출발(예정,한국시간)", "INCHEON", ""],
    ["2025.12.07 19:31", "상대국 도착", "MILANO", ""],
    ["2025.12.07 20:01", "상대국 인계", "MILANO", ""],
];
