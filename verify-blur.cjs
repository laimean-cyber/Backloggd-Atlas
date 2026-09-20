const fs=require('fs');
eval(fs.readFileSync('verify-panels.cjs','utf8').replace("if(width===1440||width===390)await page.screenshot", "await page.evaluate(()=>document.activeElement.blur());if(width===1440||width===390)await page.screenshot"));
