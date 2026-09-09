let moveText = "1. e4";
moveText = moveText.replace(/^\d+\.?\.\.\.?\s*/, "").replace(/^\d+\.\s*/, "").trim();
console.log(moveText);

let moveText2 = "2... Nc6";
moveText2 = moveText2.replace(/^\d+\.?\.\.\.?\s*/, "").replace(/^\d+\.\s*/, "").trim();
console.log(moveText2);

let moveText3 = "3. ... a6";
moveText3 = moveText3.replace(/^\d+\.?\.\.\.?\s*/, "").replace(/^\d+\.\s*/, "").trim();
console.log(moveText3);
