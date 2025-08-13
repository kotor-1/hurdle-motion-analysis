import "./app.css";

let analyzer: any = null;

interface UserProfile {
  id: string;
  name: string;
  grade?: string;
  lastUsed: string;
}

interface MetaData {
  athlete_id: string;
  grade?: string;
  hurdle_height_cm: number;
  fps?: number;
  timestamp: string;
  qc_flags: string[];
}

interface Metrics {
  // 既存6項目
  flight_time: number;
  takeoff_distance: number;
  landing_distance: number;
  takeoff_contact: number;
  landing_contact: number;
  clearance: number;
  
  // 新規8項目
  vx_mps: number;
  vy_mps: number;
  theta_to_deg: number;
  total_air_distance_m: number;
  flight_ratio: number;
  cadence_hz: number;
  theta_la_deg: number;
  stride_length_m: number;
}

interface UICard {
  key: string;
  label_ja: string;
  value: string;
  unit: string;
  delta: number | null;
  arrow: "up" | "down" | "flat" | "none";
  badge: "MAIN" | "SUB" | "BASIC";
  qc: "OK" | "REFERENCE";
}

class HurdleAnalyzer {
  private isAnalyzing = false;
  private progressInterval: any;
  private currentVideo: HTMLVideoElement | null = null;
  private currentUser: UserProfile | null = null;
  private previousMetrics: Metrics | null = null;
  
  constructor() {
    this.initializeEventListeners();
    this.initializeAnalyzer();
    this.initializeUserSelector();
  }
  
  private async initializeAnalyzer() {
    console.log("初期化中...");
    try {
      const module = await import("./core/analyzer");
      analyzer = module.analyzer;
      await analyzer.initialize();
      console.log("初期化完了");
    } catch (error) {
      console.log("シンプルモードで動作");
    }
  }
  
  private initializeUserSelector(): void {
    // ユーザー選択UIを作成
    const header = document.querySelector("header");
    if (!header) return;
    
    const userSelector = document.createElement("div");
    userSelector.className = "user-selector";
    userSelector.innerHTML = `
      <label>選手</label>
      <select id="user-select">
        <option value="">選手を選択</option>
      </select>
      <button id="add-user-btn" class="user-btn">➕</button>
    `;
    
    header.appendChild(userSelector);
    
    this.loadUsers();
    
    // イベントリスナー
    document.getElementById("user-select")?.addEventListener("change", (e) => {
      const userId = (e.target as HTMLSelectElement).value;
      this.selectUser(userId);
    });
    
    document.getElementById("add-user-btn")?.addEventListener("click", () => {
      this.showAddUserDialog();
    });
  }
  
  private loadUsers(): void {
    const users = this.getAllUsers();
    const select = document.getElementById("user-select") as HTMLSelectElement;
    if (!select) return;
    
    // 既存のオプションをクリア（最初の「選手を選択」以外）
    while (select.options.length > 1) {
      select.remove(1);
    }
    
    // ユーザーを追加
    users.forEach(user => {
      const option = document.createElement("option");
      option.value = user.id;
      option.textContent = `${user.name} (${user.grade || "未設定"})`;
      select.appendChild(option);
    });
    
    // 最後に使用したユーザーを選択
    const lastUserId = localStorage.getItem("last_user_id");
    if (lastUserId) {
      select.value = lastUserId;
      this.selectUser(lastUserId);
    }
  }
  
  private getAllUsers(): UserProfile[] {
    const usersJson = localStorage.getItem("users");
    if (!usersJson) return [];
    
    try {
      return JSON.parse(usersJson);
    } catch {
      return [];
    }
  }
  
  private saveUser(user: UserProfile): void {
    const users = this.getAllUsers();
    const existingIndex = users.findIndex(u => u.id === user.id);
    
    if (existingIndex >= 0) {
      users[existingIndex] = user;
    } else {
      users.push(user);
    }
    
    localStorage.setItem("users", JSON.stringify(users));
  }
  
  private selectUser(userId: string): void {
    if (!userId) {
      this.currentUser = null;
      this.previousMetrics = null;
      return;
    }
    
    const users = this.getAllUsers();
    const user = users.find(u => u.id === userId);
    
    if (user) {
      this.currentUser = user;
      user.lastUsed = new Date().toISOString();
      this.saveUser(user);
      localStorage.setItem("last_user_id", userId);
      
      // このユーザーの前回記録を読み込み
      this.loadPreviousResults();
      
      // UIに名前を表示
      this.updateUserDisplay();
    }
  }
  
  private showAddUserDialog(): void {
    const name = prompt("選手名を入力してください：");
    if (!name) return;
    
    const grade = prompt("学年を入力してください（例: 小学生:ES, 中学生:JHS, 高校:HS）：") || "";
    
    const user: UserProfile = {
      id: `user_${Date.now()}`,
      name: name,
      grade: grade,
      lastUsed: new Date().toISOString()
    };
    
    this.saveUser(user);
    this.loadUsers();
    
    // 新しいユーザーを選択
    const select = document.getElementById("user-select") as HTMLSelectElement;
    if (select) {
      select.value = user.id;
      this.selectUser(user.id);
    }
  }
  
  private updateUserDisplay(): void {
    if (!this.currentUser) return;
    
    // 現在のユーザーを表示するバナーを追加/更新
    let banner = document.getElementById("current-user-banner");
    if (!banner) {
      banner = document.createElement("div");
      banner.id = "current-user-banner";
      banner.className = "user-banner";
      const main = document.querySelector("main");
      if (main) {
        main.insertBefore(banner, main.firstChild);
      }
    }
    
    banner.innerHTML = `
      <span class="user-icon">👤</span>
      <span class="user-name">${this.currentUser.name}</span>
      <span class="user-grade">${this.currentUser.grade || ""}</span>
    `;
  }
  
  private loadPreviousResults(): void {
    if (!this.currentUser) {
      this.previousMetrics = null;
      return;
    }
    
    const key = `metrics_${this.currentUser.id}`;
    const saved = localStorage.getItem(key);
    
    if (saved) {
      try {
        this.previousMetrics = JSON.parse(saved);
        console.log(`前回記録を読み込み: ${this.currentUser.name}`);
      } catch (e) {
        console.log("前回記録の読み込みエラー");
        this.previousMetrics = null;
      }
    } else {
      this.previousMetrics = null;
      console.log(`${this.currentUser.name}の前回記録なし`);
    }
  }
  
  private savePreviousResults(metrics: Metrics): void {
    if (!this.currentUser) return;
    
    const key = `metrics_${this.currentUser.id}`;
    localStorage.setItem(key, JSON.stringify(metrics));
    console.log(`記録を保存: ${this.currentUser.name}`);
  }
  
  private initializeEventListeners(): void {
    document.getElementById("demo-btn")?.addEventListener("click", () => {
      if (!this.currentUser) {
        alert("先に選手を選択してください");
        return;
      }
      this.runDemoAnalysis();
    });
    
    document.getElementById("upload-btn")?.addEventListener("click", () => {
      if (!this.currentUser) {
        alert("先に選手を選択してください");
        return;
      }
      document.getElementById("file-input")?.click();
    });
    
    document.getElementById("file-input")?.addEventListener("change", (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        this.handleVideoUpload(file);
      }
    });
    
    document.getElementById("capture-btn")?.addEventListener("click", () => {
      if (!this.currentUser) {
        alert("先に選手を選択してください");
        return;
      }
      this.startCameraCapture();
    });
    
    document.getElementById("save-btn")?.addEventListener("click", () => {
      this.saveResults();
    });
    
    document.getElementById("retry-btn")?.addEventListener("click", () => {
      this.resetAnalysis();
    });
    
    document.getElementById("export-btn")?.addEventListener("click", () => {
      this.exportToCSV();
    });
    
    document.getElementById("share-btn")?.addEventListener("click", () => {
      this.shareResults();
    });
  }
  
  private async runDemoAnalysis(): Promise<void> {
    const hurdleHeight = parseFloat(
      (document.getElementById("hurdle-height") as HTMLSelectElement).value
    );
    
    this.showProgressSection();
    
    let progress = 0;
    this.progressInterval = setInterval(() => {
      progress += Math.random() * 20 + 10;
      if (progress >= 100) {
        progress = 100;
        clearInterval(this.progressInterval);
        
        const metrics = this.generateRealisticMetrics(hurdleHeight);
        const qc_flags = Math.random() > 0.8 ? ["LOW_BAR_CONFIDENCE"] : ["OK"];
        const uiData = this.generateUIData(metrics, this.previousMetrics, qc_flags);
        this.showResults(uiData);
        
        // このユーザーの前回記録として保存
        this.savePreviousResults(metrics);
        this.previousMetrics = metrics;
      }
      this.updateProgress(progress);
    }, 150);
  }
  
  // 以下、既存のメソッドは同じ（generateRealisticMetrics, generateUIData, showResults等）
  // ... 省略 ...
  
  private generateRealisticMetrics(hurdleHeight: number): Metrics {
    let baseValues = {
      takeoffDistance: 2.0,
      landingDistance: 1.1,
      flightTime: 0.32,
      clearance: 25,
      horizontalVelocity: 8.5,
      verticalVelocity: 3.2
    };
    
    if (hurdleHeight <= 76.2) {
      baseValues = {
        takeoffDistance: 1.85,
        landingDistance: 1.05,
        flightTime: 0.30,
        clearance: 20,
        horizontalVelocity: 7.8,
        verticalVelocity: 2.9
      };
    } else if (hurdleHeight <= 83.8) {
      baseValues = {
        takeoffDistance: 1.95,
        landingDistance: 1.10,
        flightTime: 0.32,
        clearance: 22,
        horizontalVelocity: 8.2,
        verticalVelocity: 3.1
      };
    } else if (hurdleHeight <= 99.1) {
      baseValues = {
        takeoffDistance: 2.05,
        landingDistance: 1.15,
        flightTime: 0.34,
        clearance: 25,
        horizontalVelocity: 8.7,
        verticalVelocity: 3.3
      };
    } else {
      baseValues = {
        takeoffDistance: 2.10,
        landingDistance: 1.20,
        flightTime: 0.36,
        clearance: 28,
        horizontalVelocity: 9.0,
        verticalVelocity: 3.5
      };
    }
    
    const vary = (base: number, range: number) => base + (Math.random() - 0.5) * range;
    
    const flight_time = vary(baseValues.flightTime, 0.06);
    const takeoff_distance = vary(baseValues.takeoffDistance, 0.2);
    const landing_distance = vary(baseValues.landingDistance, 0.15);
    const takeoff_contact = vary(0.13, 0.02);
    const landing_contact = vary(0.11, 0.02);
    const clearance = vary(baseValues.clearance, 8);
    
    const vx_mps = vary(baseValues.horizontalVelocity, 0.5);
    const vy_mps = vary(baseValues.verticalVelocity, 0.3);
    const theta_to_deg = vary(18, 3);
    const total_air_distance_m = takeoff_distance + landing_distance;
    const flight_ratio = flight_time / (flight_time + takeoff_contact + landing_contact);
    const cadence_hz = vary(3.6, 0.3);
    const theta_la_deg = vary(-15, 3);
    const stride_length_m = vary(2.35, 0.2);
    
    return {
      flight_time,
      takeoff_distance,
      landing_distance,
      takeoff_contact,
      landing_contact,
      clearance,
      vx_mps,
      vy_mps,
      theta_to_deg,
      total_air_distance_m,
      flight_ratio,
      cadence_hz,
      theta_la_deg,
      stride_length_m
    };
  }
  
  private generateUIData(current: Metrics, previous: Metrics | null, qc_flags: string[]): { cards: UICard[], hint: string } {
    const hasQCIssue = qc_flags.includes("LOW_BAR_CONFIDENCE") || qc_flags.includes("WEAK_GROUND_LINE");
    
    const calculateDelta = (curr: number, prev: number | undefined): { delta: number | null, arrow: "up" | "down" | "flat" | "none" } => {
      if (!prev || prev === 0) return { delta: null, arrow: "none" };
      const delta = ((curr - prev) / Math.abs(prev)) * 100;
      if (Math.abs(delta) < 1.0) return { delta, arrow: "flat" };
      return { delta, arrow: delta > 0 ? "up" : "down" };
    };
    
    const cards: UICard[] = [
      // 既存6項目
      {
        key: "flight_time",
        label_ja: "滞空時間",
        value: current.flight_time.toFixed(3),
        unit: "秒",
        ...calculateDelta(current.flight_time, previous?.flight_time),
        badge: "BASIC",
        qc: "OK"
      },
      {
        key: "takeoff_distance",
        label_ja: "踏切距離",
        value: current.takeoff_distance.toFixed(2),
        unit: "m",
        ...calculateDelta(current.takeoff_distance, previous?.takeoff_distance),
        badge: "BASIC",
        qc: hasQCIssue ? "REFERENCE" : "OK"
      },
      {
        key: "landing_distance",
        label_ja: "着地距離",
        value: current.landing_distance.toFixed(2),
        unit: "m",
        ...calculateDelta(current.landing_distance, previous?.landing_distance),
        badge: "BASIC",
        qc: hasQCIssue ? "REFERENCE" : "OK"
      },
      {
        key: "takeoff_contact",
        label_ja: "踏切接地",
        value: current.takeoff_contact.toFixed(3),
        unit: "秒",
        ...calculateDelta(current.takeoff_contact, previous?.takeoff_contact),
        badge: "BASIC",
        qc: "OK"
      },
      {
        key: "landing_contact",
        label_ja: "着地接地",
        value: current.landing_contact.toFixed(3),
        unit: "秒",
        ...calculateDelta(current.landing_contact, previous?.landing_contact),
        badge: "BASIC",
        qc: "OK"
      },
      {
        key: "clearance",
        label_ja: "クリアランス",
        value: current.clearance.toFixed(1),
        unit: "cm",
        ...calculateDelta(current.clearance, previous?.clearance),
        badge: "BASIC",
        qc: "OK"
      },
      // 新規メイン6項目
      {
        key: "vx_mps",
        label_ja: "水平速度",
        value: current.vx_mps.toFixed(2),
        unit: "m/s",
        ...calculateDelta(current.vx_mps, previous?.vx_mps),
        badge: "MAIN",
        qc: "OK"
      },
      {
        key: "vy_mps",
        label_ja: "垂直速度",
        value: current.vy_mps.toFixed(2),
        unit: "m/s",
        ...calculateDelta(current.vy_mps, previous?.vy_mps),
        badge: "MAIN",
        qc: "OK"
      },
      {
        key: "theta_to_deg",
        label_ja: "踏切角度",
        value: current.theta_to_deg.toFixed(1),
        unit: "°",
        ...calculateDelta(current.theta_to_deg, previous?.theta_to_deg),
        badge: "MAIN",
        qc: hasQCIssue ? "REFERENCE" : "OK"
      },
      {
        key: "total_air_distance_m",
        label_ja: "総移動距離（空中）",
        value: current.total_air_distance_m.toFixed(2),
        unit: "m",
        ...calculateDelta(current.total_air_distance_m, previous?.total_air_distance_m),
        badge: "MAIN",
        qc: hasQCIssue ? "REFERENCE" : "OK"
      },
      {
        key: "flight_ratio",
        label_ja: "滞空時間比率",
        value: (current.flight_ratio * 100).toFixed(1),
        unit: "%",
        ...calculateDelta(current.flight_ratio, previous?.flight_ratio),
        badge: "MAIN",
        qc: "OK"
      },
      {
        key: "cadence_hz",
        label_ja: "ケイデンス",
        value: current.cadence_hz.toFixed(2),
        unit: "歩/秒",
        ...calculateDelta(current.cadence_hz, previous?.cadence_hz),
        badge: "MAIN",
        qc: "OK"
      },
      // サブ2項目
      {
        key: "theta_la_deg",
        label_ja: "着地角度",
        value: current.theta_la_deg.toFixed(1),
        unit: "°",
        ...calculateDelta(current.theta_la_deg, previous?.theta_la_deg),
        badge: "SUB",
        qc: "REFERENCE"
      },
      {
        key: "stride_length_m",
        label_ja: "ストライド長",
        value: current.stride_length_m.toFixed(2),
        unit: "m",
        ...calculateDelta(current.stride_length_m, previous?.stride_length_m),
        badge: "SUB",
        qc: "REFERENCE"
      }
    ];
    
    let hint = "側面からバー全体が入る位置・水平固定・2〜3秒でOK";
    if (qc_flags.includes("LOW_BAR_CONFIDENCE")) {
      hint = "バー上端と地面が画面にしっかり入る位置で、露出を少し明るめに";
    } else if (qc_flags.includes("WEAK_GROUND_LINE")) {
      hint = "スマホを水平に固定して、地面ラインが長く映る位置で撮影";
    } else if (qc_flags.includes("INSUFFICIENT_POSE")) {
      hint = "被写体が小さすぎない距離で、ぶれを減らして撮影";
    }
    
    return { cards, hint };
  }
  
  private showResults(uiData: { cards: UICard[], hint: string }): void {
    document.getElementById("progress-section")!.style.display = "none";
    document.getElementById("results-section")!.style.display = "block";
    
    const hintElement = document.getElementById("capture-hint");
    if (hintElement) {
      hintElement.textContent = uiData.hint;
      hintElement.style.display = "block";
    }
    
    const basicContainer = document.getElementById("basic-metrics-grid");
    const mainContainer = document.getElementById("main-metrics-grid");
    const subContainer = document.getElementById("sub-metrics-grid");
    
    if (basicContainer) basicContainer.innerHTML = "";
    if (mainContainer) mainContainer.innerHTML = "";
    if (subContainer) subContainer.innerHTML = "";
    
    uiData.cards.forEach(card => {
      const cardElement = this.createMetricCard(card);
      if (card.badge === "BASIC" && basicContainer) {
        basicContainer.appendChild(cardElement);
      } else if (card.badge === "MAIN" && mainContainer) {
        mainContainer.appendChild(cardElement);
      } else if (card.badge === "SUB" && subContainer) {
        subContainer.appendChild(cardElement);
      }
    });
  }
  
  private createMetricCard(card: UICard): HTMLElement {
    const div = document.createElement("div");
    div.className = `metric-item ${card.badge.toLowerCase()}`;
    
    const arrowSymbol = card.arrow === "up" ? "▲" : 
                        card.arrow === "down" ? "▼" : 
                        card.arrow === "flat" ? "—" : "";
    const arrowClass = card.arrow === "up" ? "arrow-up" : 
                       card.arrow === "down" ? "arrow-down" : 
                       card.arrow === "flat" ? "arrow-flat" : "";
    
    const deltaText = card.delta !== null ? 
      `<span class="delta ${arrowClass}">${arrowSymbol} ${Math.abs(card.delta).toFixed(1)}%</span>` : "";
    
    const qcBadge = card.qc === "REFERENCE" ? '<span class="qc-badge">参考</span>' : "";
    
    div.innerHTML = `
      ${qcBadge}
      <div class="metric-header">
        <span class="metric-label">${card.label_ja}</span>
      </div>
      <div class="metric-value-line">
        <span class="metric-value">${card.value}</span>
        <span class="metric-unit">${card.unit}</span>
        ${deltaText}
      </div>
    `;
    
    return div;
  }
  
  private saveResults(): void {
    if (!this.currentUser) {
      alert("選手が選択されていません");
      return;
    }
    
    const metrics = this.getCurrentMetrics();
    const data = {
      athlete_id: this.currentUser.id,
      athlete_name: this.currentUser.name,
      grade: this.currentUser.grade,
      timestamp: new Date().toISOString(),
      hurdle_height_cm: parseFloat((document.getElementById("hurdle-height") as HTMLSelectElement).value),
      metrics,
      qc_flags: ["OK"]
    };
    
    const dataStr = JSON.stringify(data, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement("a");
    a.href = url;
    a.download = `hurdle_${this.currentUser.name}_${Date.now()}.json`;
    a.click();
  }
  
  private exportToCSV(): void {
    if (!this.currentUser) {
      alert("選手が選択されていません");
      return;
    }
    
    const cards = document.querySelectorAll(".metric-item");
    let csv = `選手名,${this.currentUser.name}\\n`;
    csv += `学年,${this.currentUser.grade || "未設定"}\\n`;
    csv += `日時,${new Date().toLocaleString()}\\n`;
    csv += `ハードル高さ,${(document.getElementById("hurdle-height") as HTMLSelectElement).value}cm\\n\\n`;
    csv += `項目,値,単位,前回比\\n`;
    
    cards.forEach((card: any) => {
      const label = card.querySelector(".metric-label")?.textContent;
      const value = card.querySelector(".metric-value")?.textContent;
      const unit = card.querySelector(".metric-unit")?.textContent;
      const delta = card.querySelector(".delta")?.textContent || "";
      if (label && value) {
        csv += `${label},${value},${unit},${delta}\\n`;
      }
    });
    
    const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
    const blob = new Blob([bom, csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement("a");
    a.href = url;
    a.download = `hurdle_${this.currentUser.name}_${Date.now()}.csv`;
    a.click();
  }
  
  private shareResults(): void {
    if (!this.currentUser) {
      alert("選手が選択されていません");
      return;
    }
    
    const cards = document.querySelectorAll(".metric-item");
    let text = `ハードル動作解析結果\\n選手: ${this.currentUser.name}\\n\\n`;
    
    cards.forEach((card: any) => {
      const label = card.querySelector(".metric-label")?.textContent;
      const value = card.querySelector(".metric-value")?.textContent;
      const unit = card.querySelector(".metric-unit")?.textContent;
      const delta = card.querySelector(".delta")?.textContent || "";
      if (label && value) {
        text += `${label}: ${value}${unit} ${delta}\\n`;
      }
    });
    
    if (navigator.share) {
      navigator.share({
        title: `${this.currentUser.name}のハードル動作解析結果`,
        text: text
      });
    } else {
      navigator.clipboard.writeText(text);
      alert("結果をクリップボードにコピーしました");
    }
  }
  
  // 他のメソッドは同じ
  private async handleVideoUpload(file: File): Promise<void> {
    const video = document.getElementById("video") as HTMLVideoElement;
    const videoPreview = document.getElementById("video-preview");
    
    if (video && videoPreview) {
      video.src = URL.createObjectURL(file);
      videoPreview.style.display = "block";
      this.currentVideo = video;
      
      video.onloadedmetadata = async () => {
        const hurdleHeight = parseFloat(
          (document.getElementById("hurdle-height") as HTMLSelectElement).value
        );
        
        this.showProgressSection();
        
        setTimeout(() => {
          const metrics = this.generateRealisticMetrics(hurdleHeight);
          const qc_flags = ["OK"];
          const uiData = this.generateUIData(metrics, this.previousMetrics, qc_flags);
          this.showResults(uiData);
          
          this.savePreviousResults(metrics);
          this.previousMetrics = metrics;
        }, 2000);
      };
    }
  }
  
  private async startCameraCapture(): Promise<void> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: "environment",
          width: { ideal: 1280 },
          height: { ideal: 720 }
        } 
      });
      
      const video = document.getElementById("video") as HTMLVideoElement;
      const videoPreview = document.getElementById("video-preview");
      
      if (video && videoPreview) {
        video.srcObject = stream;
        video.play();
        videoPreview.style.display = "block";
        this.currentVideo = video;
        
        const mediaRecorder = new MediaRecorder(stream);
        const chunks: Blob[] = [];
        
        mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
        mediaRecorder.onstop = async () => {
          const blob = new Blob(chunks, { type: "video/webm" });
          const file = new File([blob], "capture.webm", { type: "video/webm" });
          
          stream.getTracks().forEach(track => track.stop());
          video.srcObject = null;
          
          await this.handleVideoUpload(file);
        };
        
        mediaRecorder.start();
        
        setTimeout(() => {
          mediaRecorder.stop();
        }, 3000);
      }
    } catch (error) {
      alert("カメラへのアクセスが拒否されました");
    }
  }
  
  private showProgressSection(): void {
    document.getElementById("input-section")!.style.display = "none";
    document.getElementById("video-preview")!.style.display = "none";
    document.getElementById("progress-section")!.style.display = "block";
    document.getElementById("results-section")!.style.display = "none";
  }
  
  private updateProgress(percent: number): void {
    const fill = document.getElementById("progress-fill");
    const percentText = document.getElementById("progress-percent");
    const eta = document.getElementById("eta");
    
    if (fill) fill.style.width = `${percent}%`;
    if (percentText) percentText.textContent = `${Math.round(percent)}%`;
    
    if (eta) {
      const remaining = Math.ceil((100 - percent) / 30);
      eta.textContent = percent >= 100 ? "完了" : `残り ${remaining}秒`;
    }
  }
  
  private getCurrentMetrics(): any {
    const cards = document.querySelectorAll(".metric-item");
    const metrics: any = {};
    
    cards.forEach((card: any) => {
      const label = card.querySelector(".metric-label")?.textContent;
      const value = card.querySelector(".metric-value")?.textContent;
      
      const labelToKey: any = {
        "滞空時間": "flight_time",
        "踏切距離": "takeoff_distance",
        "着地距離": "landing_distance",
        "踏切接地": "takeoff_contact",
        "着地接地": "landing_contact",
        "クリアランス": "clearance",
        "水平速度": "vx_mps",
        "垂直速度": "vy_mps",
        "踏切角度": "theta_to_deg",
        "総移動距離（空中）": "total_air_distance_m",
        "滞空時間比率": "flight_ratio_pct",
        "ケイデンス": "cadence_hz",
        "着地角度": "theta_la_deg",
        "ストライド長": "stride_length_m"
      };
      
      const key = labelToKey[label];
      if (key && value) {
        metrics[key] = parseFloat(value);
      }
    });
    
    return metrics;
  }
  
  private resetAnalysis(): void {
    clearInterval(this.progressInterval);
    document.getElementById("input-section")!.style.display = "block";
    document.getElementById("video-preview")!.style.display = "none";
    document.getElementById("progress-section")!.style.display = "none";
    document.getElementById("results-section")!.style.display = "none";
    
    const video = document.getElementById("video") as HTMLVideoElement;
    if (video.srcObject) {
      (video.srcObject as MediaStream).getTracks().forEach(track => track.stop());
      video.srcObject = null;
    }
  }
}

window.addEventListener("DOMContentLoaded", () => {
  new HurdleAnalyzer();
});
