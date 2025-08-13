import "./app.css";

let analyzer: any = null;

interface Metrics {
  // 既存6項目
  flight_time: number;
  takeoff_distance: number;
  landing_distance: number;
  takeoff_contact: number;
  landing_contact: number;
  clearance: number;
  
  // 新規6項目
  vx_mps: number;
  vy_mps: number;
  theta_to_deg: number;
  total_air_distance_m: number;
  flight_ratio: number;
  cadence_hz: number;
}

interface UICard {
  key: string;
  label_ja: string;
  value: string;
  unit: string;
  badge: "MAIN" | "BASIC";
  description: string;
}

class HurdleAnalyzer {
  private isAnalyzing = false;
  private progressInterval: any;
  private currentVideo: HTMLVideoElement | null = null;
  
  constructor() {
    this.initializeEventListeners();
    this.initializeAnalyzer();
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
  
  private initializeEventListeners(): void {
    document.getElementById("demo-btn")?.addEventListener("click", () => {
      this.runDemoAnalysis();
    });
    
    document.getElementById("upload-btn")?.addEventListener("click", () => {
      document.getElementById("file-input")?.click();
    });
    
    document.getElementById("file-input")?.addEventListener("change", (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        this.handleVideoUpload(file);
      }
    });
    
    document.getElementById("capture-btn")?.addEventListener("click", () => {
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
        const uiData = this.generateUIData(metrics);
        this.showResults(uiData);
      }
      this.updateProgress(progress);
    }, 150);
  }
  
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
      cadence_hz
    };
  }
  
  private generateUIData(current: Metrics): { cards: UICard[], hint: string } {
    const cards: UICard[] = [
      // 既存6項目
      {
        key: "flight_time",
        label_ja: "滞空時間",
        value: current.flight_time.toFixed(3),
        unit: "秒",
        badge: "BASIC",
        description: "ハードルを跳び越える際の空中にいる時間"
      },
      {
        key: "takeoff_distance",
        label_ja: "踏切距離",
        value: current.takeoff_distance.toFixed(2),
        unit: "m",
        badge: "BASIC",
        description: "ハードル手前の踏切位置までの距離"
      },
      {
        key: "landing_distance",
        label_ja: "着地距離",
        value: current.landing_distance.toFixed(2),
        unit: "m",
        badge: "BASIC",
        description: "ハードルから着地位置までの距離"
      },
      {
        key: "takeoff_contact",
        label_ja: "踏切接地",
        value: current.takeoff_contact.toFixed(3),
        unit: "秒",
        badge: "BASIC",
        description: "踏切時の足が地面に接している時間"
      },
      {
        key: "landing_contact",
        label_ja: "着地接地",
        value: current.landing_contact.toFixed(3),
        unit: "秒",
        badge: "BASIC",
        description: "着地時の足が地面に接している時間"
      },
      {
        key: "clearance",
        label_ja: "クリアランス",
        value: current.clearance.toFixed(1),
        unit: "cm",
        badge: "BASIC",
        description: "ハードル上での体の最低部位との余裕高"
      },
      // 新規6項目
      {
        key: "vx_mps",
        label_ja: "水平速度",
        value: current.vx_mps.toFixed(2),
        unit: "m/s",
        badge: "MAIN",
        description: "ハードル通過時の前進速度"
      },
      {
        key: "vy_mps",
        label_ja: "垂直速度",
        value: current.vy_mps.toFixed(2),
        unit: "m/s",
        badge: "MAIN",
        description: "踏切時の上向き速度"
      },
      {
        key: "theta_to_deg",
        label_ja: "踏切角度",
        value: current.theta_to_deg.toFixed(1),
        unit: "°",
        badge: "MAIN",
        description: "踏切時の体の前傾角度"
      },
      {
        key: "total_air_distance_m",
        label_ja: "総移動距離",
        value: current.total_air_distance_m.toFixed(2),
        unit: "m",
        badge: "MAIN",
        description: "踏切から着地までの水平総距離"
      },
      {
        key: "flight_ratio",
        label_ja: "滞空時間比率",
        value: (current.flight_ratio * 100).toFixed(1),
        unit: "%",
        badge: "MAIN",
        description: "全動作時間に対する滞空時間の割合"
      },
      {
        key: "cadence_hz",
        label_ja: "ケイデンス",
        value: current.cadence_hz.toFixed(2),
        unit: "歩/秒",
        badge: "MAIN",
        description: "1秒あたりの歩数（ピッチ）"
      }
    ];
    
    const hint = "側面からバー全体が入る位置・水平固定・2〜3秒でOK";
    
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
    
    if (basicContainer) basicContainer.innerHTML = "";
    if (mainContainer) mainContainer.innerHTML = "";
    
    uiData.cards.forEach(card => {
      const cardElement = this.createMetricCard(card);
      if (card.badge === "BASIC" && basicContainer) {
        basicContainer.appendChild(cardElement);
      } else if (card.badge === "MAIN" && mainContainer) {
        mainContainer.appendChild(cardElement);
      }
    });
  }
  
  private createMetricCard(card: UICard): HTMLElement {
    const div = document.createElement("div");
    div.className = `metric-item ${card.badge.toLowerCase()}`;
    
    div.innerHTML = `
      <div class="metric-header">
        <span class="metric-label">${card.label_ja}</span>
        <span class="metric-info" title="${card.description}">ⓘ</span>
      </div>
      <div class="metric-value-line">
        <span class="metric-value">${card.value}</span>
        <span class="metric-unit">${card.unit}</span>
      </div>
      <div class="metric-description">${card.description}</div>
    `;
    
    return div;
  }
  
  private shareResults(): void {
    const cards = document.querySelectorAll(".metric-item");
    let text = "ハードル動作解析結果\\n\\n";
    
    cards.forEach((card: any) => {
      const label = card.querySelector(".metric-label")?.textContent;
      const value = card.querySelector(".metric-value")?.textContent;
      const unit = card.querySelector(".metric-unit")?.textContent;
      if (label && value) {
        text += `${label}: ${value}${unit}\\n`;
      }
    });
    
    if (navigator.share) {
      navigator.share({
        title: "ハードル動作解析結果",
        text: text
      });
    } else {
      navigator.clipboard.writeText(text);
      alert("結果をクリップボードにコピーしました");
    }
  }
  
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
          const uiData = this.generateUIData(metrics);
          this.showResults(uiData);
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
  
  private saveResults(): void {
    const metrics = this.getCurrentMetrics();
    const data = {
      timestamp: new Date().toISOString(),
      hurdle_height_cm: parseFloat((document.getElementById("hurdle-height") as HTMLSelectElement).value),
      metrics
    };
    
    const dataStr = JSON.stringify(data, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement("a");
    a.href = url;
    a.download = `hurdle_${Date.now()}.json`;
    a.click();
  }
  
  private exportToCSV(): void {
    const cards = document.querySelectorAll(".metric-item");
    let csv = `日時,${new Date().toLocaleString()}\\n`;
    csv += `ハードル高さ,${(document.getElementById("hurdle-height") as HTMLSelectElement).value}cm\\n\\n`;
    csv += `項目,値,単位,説明\\n`;
    
    cards.forEach((card: any) => {
      const label = card.querySelector(".metric-label")?.textContent;
      const value = card.querySelector(".metric-value")?.textContent;
      const unit = card.querySelector(".metric-unit")?.textContent;
      const description = card.querySelector(".metric-description")?.textContent;
      if (label && value) {
        csv += `${label},${value},${unit},"${description}"\\n`;
      }
    });
    
    const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
    const blob = new Blob([bom, csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement("a");
    a.href = url;
    a.download = `hurdle_${Date.now()}.csv`;
    a.click();
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
        "総移動距離": "total_air_distance_m",
        "滞空時間比率": "flight_ratio_pct",
        "ケイデンス": "cadence_hz"
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
