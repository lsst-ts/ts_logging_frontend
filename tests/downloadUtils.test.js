import { describe, it, expect, vi, afterEach } from "vitest";

import {
  toCsv,
  downloadFile,
  buildDownloadFilename,
} from "@/utils/downloadUtils";

// jsdom's Blob has no text(), so read it through a FileReader.
function readBlobText(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsText(blob);
  });
}

describe("downloadUtils", () => {
  describe("toCsv", () => {
    it("writes a header row and one line per row, in column order", () => {
      const rows = [
        { a: 1, b: "x" },
        { a: 2, b: "y" },
      ];
      const columns = [
        { key: "b", header: "B" },
        { key: "a", header: "A" },
      ];

      expect(toCsv(rows, columns)).toBe("B,A\r\nx,1\r\ny,2");
    });

    it("uses the key as the header when none is given", () => {
      expect(toCsv([{ a: 1 }], [{ key: "a" }])).toBe("a\r\n1");
    });

    it("quotes values containing commas, quotes and newlines", () => {
      const rows = [{ text: 'a, "b"\nc' }];

      expect(toCsv(rows, [{ key: "text" }])).toBe('text\r\n"a, ""b""\nc"');
    });

    it("writes missing values as empty cells", () => {
      const rows = [{ a: null, b: undefined }];

      expect(toCsv(rows, [{ key: "a" }, { key: "b" }, { key: "c" }])).toBe(
        "a,b,c\r\n,,",
      );
    });

    it("JSON-stringifies nested objects and arrays", () => {
      const rows = [{ obj: { name: "TMA" }, list: [1, 2] }];

      expect(toCsv(rows, [{ key: "obj" }, { key: "list" }])).toBe(
        'obj,list\r\n"{""name"":""TMA""}","[1,2]"',
      );
    });

    it("escapes string cells that a spreadsheet would treat as formulas", () => {
      const rows = [{ text: "=SUM(A1)" }, { text: "-0.52" }];

      expect(toCsv(rows, [{ key: "text" }])).toBe(
        `text\r\n"'=SUM(A1)"\r\n"'-0.52"`,
      );
    });

    it("leaves numeric cells unescaped", () => {
      expect(toCsv([{ n: -0.52 }], [{ key: "n" }])).toBe("n\r\n-0.52");
    });
  });

  describe("buildDownloadFilename", () => {
    it("joins the source, telescope and dayobs range", () => {
      expect(
        buildDownloadFilename(
          "data-log",
          {
            telescope: "Simonyi",
            startDayobs: "20260101",
            endDayobs: 20260103,
          },
          "csv",
        ),
      ).toBe("nightlydigest_data-log_Simonyi_20260101-20260103.csv");
    });
  });

  describe("downloadFile", () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    it("clicks a link to the content with the filename, then cleans up", async () => {
      // jsdom does not implement object URLs.
      URL.createObjectURL = vi.fn(() => "blob:mock");
      URL.revokeObjectURL = vi.fn();
      const click = vi
        .spyOn(HTMLAnchorElement.prototype, "click")
        .mockImplementation(function () {
          expect(this.href).toBe("blob:mock");
          expect(this.download).toBe("file.csv");
        });

      downloadFile("a,b", "file.csv", "text/csv");

      expect(click).toHaveBeenCalledTimes(1);
      expect(document.querySelector("a[download]")).toBeNull();
      expect(URL.revokeObjectURL).not.toHaveBeenCalled();

      const blob = URL.createObjectURL.mock.calls[0][0];
      expect(blob.type).toBe("text/csv;charset=utf-8");
      expect(await readBlobText(blob)).toBe("a,b");

      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:mock");
    });
  });
});
