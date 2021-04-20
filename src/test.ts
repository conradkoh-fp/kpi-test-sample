import axios from "axios";
import fs from "fs";
import path from "path";
import mkdirp from "mkdirp";
const url =
  "https://v01weit38k.execute-api.ap-southeast-1.amazonaws.com/dev/v2/offline-hours?vendors=p7fk_FP_PH,p2lc_FP_PH,p3rn_FP_PH,p8zk_FP_PH,p2ir_FP_PH&startDate=2021-01-01&endDate=2021-01-31&compareStartDate=2020-12-01&compareEndDate=2020-12-31";
const outFileRoot = path.join(__dirname, "./diff");
if (!fs.existsSync(outFileRoot)) {
  mkdirp(outFileRoot);
}
let fpTarget1 = path.join(outFileRoot, "/v1.txt");
let fpTarget2 = path.join(outFileRoot, "/v2.txt");

enum ExecMode {
  Series = "series",
  Parallel = "parallel",
}
main(ExecMode.Parallel);

async function main(mode: ExecMode) {
  const RETRY_COUNT = 999;
  let results: any[] = [];
  if (mode === ExecMode.Parallel) {
    results = await Promise.all(
      createArray(RETRY_COUNT).map((i) => fetchData())
    );
  }
  let prev: any = null;
  for (let i = 0; i < RETRY_COUNT; i++) {
    console.log(`executing instance ${i} of ${RETRY_COUNT}`);
    let cur: any;
    if (mode === ExecMode.Series) {
      cur = await fetchData();
    } else if (mode == ExecMode.Parallel) {
      cur = results[i]; //Assume data was fetched in a previous step
    } else {
      throw new Error("Invalid exec mode: " + mode);
    }
    if (i > 0) {
      let v1 = JSON.stringify(prev, null, 2);
      let v2 = JSON.stringify(cur, null, 2);
      const isEqual = v1 === v2;
      if (!isEqual) {
        console.log("ERROR: INVALID DATA DETECTED. Data written to file");
        fs.writeFileSync(fpTarget1, v1);
        fs.writeFileSync(fpTarget2, v2);
        break;
      }
    }
    prev = cur;
  }
}
function createArray(v: number) {
  let arr: number[] = [];
  for (let i = 0; i < v; i++) {
    arr.push(i);
  }
  return arr;
}
async function fetchData() {
  const res = await axios.get(url);
  const data = res.data;
  const bodyData = res.data.data;
  const stableData = {
    computed: data.computed,
    data: bodyData.sort((a: any, b: any) => {
      if (a.vendorCode > b.vendorCode) {
        return 1;
      } else if (a.vendorCode < b.vendorCode) {
        return -1;
      } else {
        return 0;
      }
    }),
    updatedAt: data.updatedAt,
    insights: data.insights,
  };
  return stableData;
}
