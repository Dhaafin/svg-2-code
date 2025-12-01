"use client";

import React, { useState, useCallback } from "react";
import { Upload, Copy, Download, Check, AlertCircle } from "lucide-react";

type FormatType = "raw" | "html" | "js" | "jsx" | "tsx" | "css";

const App: React.FC = () => {
  const [svgContent, setSvgContent] = useState<string>("");
  const [selectedFormat, setSelectedFormat] = useState<FormatType>("raw");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [copySuccess, setCopySuccess] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const handleFileUpload = useCallback((file: File) => {
    setErrorMessage("");

    if (file.type !== "image/svg+xml") {
      setErrorMessage("Invalid file type. Please upload an SVG file.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setSvgContent(content);
      setSelectedFormat("raw");
    };
    reader.readAsText(file);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);

      const file = e.dataTransfer.files[0];
      if (file) {
        handleFileUpload(file);
      }
    },
    [handleFileUpload]
  );

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleFileUpload(file);
      }
    },
    [handleFileUpload]
  );

  const convertToReactProps = (svgString: string): string => {
    let converted = svgString;

    // Remove XML declaration
    converted = converted.replace(/<\?xml[^?]*\?>/g, "");

    // Convert hyphenated attributes to camelCase
    const attributeMap: Record<string, string> = {
      "stroke-width": "strokeWidth",
      "stroke-linecap": "strokeLinecap",
      "stroke-linejoin": "strokeLinejoin",
      "stroke-miterlimit": "strokeMiterlimit",
      "stroke-dasharray": "strokeDasharray",
      "stroke-dashoffset": "strokeDashoffset",
      "stroke-opacity": "strokeOpacity",
      "fill-opacity": "fillOpacity",
      "fill-rule": "fillRule",
      "clip-path": "clipPath",
      "clip-rule": "clipRule",
      "font-family": "fontFamily",
      "font-size": "fontSize",
      "font-weight": "fontWeight",
      "text-anchor": "textAnchor",
      "stop-color": "stopColor",
      "stop-opacity": "stopOpacity",
      "marker-end": "markerEnd",
      "marker-start": "markerStart",
      "marker-mid": "markerMid",
    };

    Object.entries(attributeMap).forEach(([old, newAttr]) => {
      const regex = new RegExp(old, "g");
      converted = converted.replace(regex, newAttr);
    });

    // Replace opening svg tag
    converted = converted.replace(
      /<svg([^>]*)>/,
      '<svg {...props} fill="currentColor" role="img"$1>'
    );

    return converted.trim();
  };

  const getTransformedCode = useCallback((): string => {
    if (!svgContent) return "";

    switch (selectedFormat) {
      case "raw":
        return svgContent;

      case "html":
        return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SVG Icon</title>
</head>
<body>
  <div class="icon-container">
    ${svgContent}
  </div>
</body>
</html>`;

      case "js":
        return `const IconSvg = \`${svgContent}\`;

export default IconSvg;`;

      case "jsx":
        const jsxConverted = convertToReactProps(svgContent);
        return `const Icon = (props) => (
  ${jsxConverted}
);

export default Icon;`;

      case "tsx":
        const tsxConverted = convertToReactProps(svgContent);
        return `import { SVGProps } from 'react';

const Icon = (props: SVGProps<SVGSVGElement>) => (
  ${tsxConverted}
);

export default Icon;`;

      case "css":
        const encodedSvg = encodeURIComponent(svgContent)
          .replace(/'/g, "%27")
          .replace(/"/g, "%22");
        return `.icon-bg {
  background-image: url("data:image/svg+xml;charset=utf8,${encodedSvg}");
  background-size: contain;
  background-repeat: no-repeat;
  background-position: center;
  width: 24px;
  height: 24px;
}`;

      default:
        return svgContent;
    }
  }, [svgContent, selectedFormat]);

  const handleCopy = useCallback(async () => {
    const code = getTransformedCode();
    try {
      await navigator.clipboard.writeText(code);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  }, [getTransformedCode]);

  const handleDownload = useCallback(() => {
    const code = getTransformedCode();
    const extensions: Record<FormatType, string> = {
      raw: "svg",
      html: "html",
      js: "js",
      jsx: "jsx",
      tsx: "tsx",
      css: "css",
    };

    const blob = new Blob([code], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `icon.${extensions[selectedFormat]}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [getTransformedCode, selectedFormat]);

  const formats: { id: FormatType; label: string; description: string }[] = [
    { id: "raw", label: "Raw SVG", description: "Original SVG markup" },
    { id: "html", label: "HTML", description: "HTML document wrapper" },
    { id: "js", label: "JavaScript", description: "JS template literal" },
    { id: "jsx", label: "JSX", description: "React component (untyped)" },
    { id: "tsx", label: "TSX", description: "TypeScript React component" },
    { id: "css", label: "CSS", description: "Data URI background" },
  ];

  const getFormatLabel = (): string => {
    const format = formats.find((f) => f.id === selectedFormat);
    return format ? format.label : "Code Viewer";
  };

  return (
    <div className="min-h-screen bg-amber-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6 sm:mb-8 md:mb-10">
          <div className="inline-block bg-white border-2 sm:border-4 border-amber-900 px-4 py-4 sm:px-6 sm:py-5 md:px-8 md:py-6 mb-4 shadow-lg">
            <h1
              className="text-3xl sm:text-4xl md:text-5xl font-bold text-amber-900 mb-2 tracking-wide"
              style={{ fontFamily: "Georgia, serif" }}
            >
              SVG2CODE
            </h1>
            <div className="h-1 w-20 sm:w-28 md:w-32 bg-amber-900 mx-auto mb-2"></div>
            <p
              className="text-amber-800 text-xs sm:text-sm uppercase tracking-wider sm:tracking-widest"
              style={{ fontFamily: "Georgia, serif" }}
            >
              Classic Code Transformation Utility
            </p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-6">
          {/* Column 1: Upload and Format Selection */}
          <div className="space-y-6">
            {/* File Upload Area */}
            <div className="bg-white border-2 sm:border-4 border-amber-900 shadow-lg p-4 sm:p-6">
              <h2
                className="text-xl sm:text-2xl font-bold text-amber-900 mb-3 sm:mb-4 pb-2 border-b-2 border-amber-900"
                style={{ fontFamily: "Georgia, serif" }}
              >
                Upload SVG
              </h2>
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                className={`border-2 sm:border-4 border-dashed p-6 sm:p-8 text-center transition-all ${
                  isDragging
                    ? "border-amber-700 bg-amber-100"
                    : "border-amber-400 bg-amber-50 hover:border-amber-600"
                }`}
              >
                <Upload className="mx-auto h-10 w-10 sm:h-12 sm:w-12 text-amber-700 mb-3 sm:mb-4" />
                <p className="text-amber-900 mb-2 font-semibold text-sm sm:text-base">
                  Drag and drop your SVG file here
                </p>
                <p className="text-xs sm:text-sm text-amber-700 mb-3 sm:mb-4">
                  or
                </p>
                <label className="inline-block">
                  <input
                    type="file"
                    accept=".svg,image/svg+xml"
                    onChange={handleFileInput}
                    className="hidden"
                  />
                  <span className="px-4 py-2 sm:px-6 sm:py-3 bg-amber-900 text-amber-50 text-xs sm:text-sm font-semibold cursor-pointer hover:bg-amber-800 transition-colors inline-block border-2 border-amber-950 shadow-md">
                    BROWSE FILES
                  </span>
                </label>
              </div>

              {errorMessage && (
                <div className="mt-4 p-3 bg-red-100 border-2 border-red-800 flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-red-800 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-900 font-semibold">
                    {errorMessage}
                  </p>
                </div>
              )}
            </div>

            {/* Format Selection */}
            <div className="bg-white border-2 sm:border-4 border-amber-900 shadow-lg p-4 sm:p-6">
              <h2
                className="text-xl sm:text-2xl font-bold text-amber-900 mb-3 sm:mb-4 pb-2 border-b-2 border-amber-900"
                style={{ fontFamily: "Georgia, serif" }}
              >
                Output Format
              </h2>
              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                {formats.map((format) => (
                  <button
                    key={format.id}
                    onClick={() => setSelectedFormat(format.id)}
                    className={`hover:cursor-pointer p-2 sm:p-3 text-left transition-all border-2 ${
                      selectedFormat === format.id
                        ? "bg-amber-900 text-amber-50 border-amber-950 shadow-md"
                        : "bg-amber-50 text-amber-900 border-amber-700 hover:bg-amber-100"
                    }`}
                  >
                    <div
                      className="font-bold text-sm sm:text-base"
                      style={{ fontFamily: "Georgia, serif" }}
                    >
                      {format.label}
                    </div>
                    <div
                      className={`text-xs mt-1 ${
                        selectedFormat === format.id
                          ? "text-amber-200"
                          : "text-amber-700"
                      }`}
                    >
                      {format.description}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Column 2: Code Viewer */}
          <div className="bg-white border-2 sm:border-4 border-amber-900 shadow-lg p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 pb-2 border-b-2 border-amber-900 gap-3 sm:gap-0">
              <h2
                className="text-xl sm:text-2xl font-bold text-amber-900"
                style={{ fontFamily: "Georgia, serif" }}
              >
                Code Viewer
              </h2>
              <div className="flex gap-2 w-full sm:w-auto">
                <button
                  onClick={handleCopy}
                  disabled={!svgContent}
                  className="flex-1 sm:flex-none px-2 sm:px-3 py-2 bg-amber-800 text-amber-50 hover:bg-amber-700 disabled:bg-amber-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-1 sm:gap-2 text-xs sm:text-sm font-semibold border-2 border-amber-950"
                >
                  {copySuccess ? (
                    <Check className="h-3 w-3 sm:h-4 sm:w-4" />
                  ) : (
                    <Copy className="h-3 w-3 sm:h-4 sm:w-4" />
                  )}
                  {copySuccess ? "COPIED!" : "COPY"}
                </button>
                <button
                  onClick={handleDownload}
                  disabled={!svgContent}
                  className="flex-1 sm:flex-none px-2 sm:px-3 py-2 bg-amber-900 text-amber-50 hover:bg-amber-800 disabled:bg-amber-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-1 sm:gap-2 text-xs sm:text-sm font-semibold border-2 border-amber-950"
                >
                  <Download className="h-3 w-3 sm:h-4 sm:w-4" />
                  DOWNLOAD
                </button>
              </div>
            </div>
            <div className="mb-2">
              <span className="text-xs text-amber-800 font-semibold uppercase tracking-wider">
                {getFormatLabel()}
              </span>
            </div>
            <textarea
              readOnly
              value={getTransformedCode()}
              placeholder="Upload an SVG file to see the transformed code here..."
              className="w-full h-64 sm:h-80 md:h-96 p-3 sm:p-4 bg-amber-50 border-2 border-amber-700 font-mono text-xs sm:text-sm text-amber-950 resize-none focus:outline-none focus:border-amber-900"
            />
          </div>
        </div>

        {/* SVG Preview */}
        <div className="bg-white border-2 sm:border-4 border-amber-900 shadow-lg p-4 sm:p-6 mb-6">
          <h2
            className="text-xl sm:text-2xl font-bold text-amber-900 mb-3 sm:mb-4 pb-2 border-b-2 border-amber-900"
            style={{ fontFamily: "Georgia, serif" }}
          >
            SVG Preview
          </h2>
          <div className="min-h-40 sm:min-h-48 border-2 sm:border-4 border-dashed border-amber-400 p-6 sm:p-8 flex items-center justify-center bg-amber-50">
            {svgContent ? (
              <div
                className="max-w-full sm:max-w-md"
                dangerouslySetInnerHTML={{ __html: svgContent }}
              />
            ) : (
              <div className="text-center text-amber-700">
                <Upload className="mx-auto h-12 w-12 sm:h-16 sm:w-16 mb-3 opacity-50" />
                <p className="font-semibold text-sm sm:text-base">
                  No SVG loaded. Upload a file to see the preview.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Feature Explanation */}
        <div className="bg-white border-2 sm:border-4 border-amber-900 shadow-lg p-4 sm:p-6">
          <h3
            className="text-lg sm:text-xl font-bold text-amber-900 mb-3 sm:mb-4 border-b-2 border-amber-900 pb-2"
            style={{ fontFamily: "Georgia, serif" }}
          >
            How It Works
          </h3>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 text-xs sm:text-sm text-amber-900">
            <div className="border-l-2 sm:border-l-4 border-amber-900 pl-3 sm:pl-4">
              <strong
                className="text-amber-950 block mb-1 text-sm sm:text-base"
                style={{ fontFamily: "Georgia, serif" }}
              >
                Upload & Transform
              </strong>
              <p>
                Upload any SVG file and instantly convert it to your preferred
                format with classic precision.
              </p>
            </div>
            <div className="border-l-2 sm:border-l-4 border-amber-900 pl-3 sm:pl-4">
              <strong
                className="text-amber-950 block mb-1 text-sm sm:text-base"
                style={{ fontFamily: "Georgia, serif" }}
              >
                React Ready
              </strong>
              <p>
                JSX and TSX formats automatically convert attributes to
                camelCase and add proper TypeScript types.
              </p>
            </div>
            <div className="border-l-2 sm:border-l-4 border-amber-900 pl-3 sm:pl-4">
              <strong
                className="text-amber-950 block mb-1 text-sm sm:text-base"
                style={{ fontFamily: "Georgia, serif" }}
              >
                Copy & Download
              </strong>
              <p>
                Easily copy to clipboard or download the transformed code for
                use in your projects.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-6 sm:mt-8">
          <p
            className="text-amber-800 text-xs sm:text-sm"
            style={{ fontFamily: "Georgia, serif" }}
          >
            A timeless utility for modern developers
          </p>
        </div>
      </div>
    </div>
  );
};

export default App;
