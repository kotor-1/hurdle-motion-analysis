import "./app.css";

interface AnalysisResult {
  flightTime: number;
  takeoffDistance: number;
  landingDistance: number;
  takeoffContact: number;
  landingContact: number;
  maxHeight: number;
}

class HurdleAnalyzer {
  private isAnalyzing = false;
  private progressInterval: any;
  
  constructor() {
    this.initializeEventListeners();
    console.log("?? Hurdle Analyzer initialized");
  }
  
  private initializeEventListeners(): void {
    // ?????
    document.getElementById("demo-btn")?.addEventListener("click", () => {
      this.runDemoAnalysis();
    });
    
    // ??????????
    document.getElementById("upload-btn")?.addEventListener("click", () => {
      document.getElementById("file-input")?.click();
    });
    
    document.getElementById("file-input")?.addEventListener("change", (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        this.handleVideoUpload(file);
      }
    });
    
    // ?????
    document.getElementById("capture-btn")?.addEventListener("click", () => {
      this.startCameraCapture();
    });
    
    // ????
    document.getElementById("save-btn")?.addEventListener("click", () => {
      this.saveResults();
    });
    
    // ???
    document.getElementById("retry-btn")?.addEventListener("click", () => {
      this.resetAnalysis();
    });
    
    // CSV??????
    document.getElementById("export-btn")?.addEventListener("click", () => {
      this.exportToCSV();
    });
  }
  
  private async runDemoAnalysis(): Promise<void> {
    console.log("?? Running demo analysis...");
    this.showProgressSection();
    
    let progress = 0;
    this.progressInterval = setInterval(() => {
      progress += Math.random() * 15;
      if (progress >= 100) {
        progress = 100;
        clearInterval(this.progressInterval);
        this.showResults({
          flightTime: 0.37,
          takeoffDistance: 1.95,
          landingDistance: 1.40,
          takeoffContact: 0.14,
          landingContact: 0.12,
          maxHeight: 45.2
        });
      }
      this.updateProgress(progress);
    }, 200);
  }
  
  private handleVideoUpload(file: File): void {
    console.log(`?? Uploading video: ${file.name}`);
    
    // ??????????
    const video = document.getElementById("video") as HTMLVideoElement;
    const videoPreview = document.getElementById("video-preview");
    
    if (video && videoPreview) {
      video.src = URL.createObjectURL(file);
      videoPreview.style.display = "block";
      
      // ????
      setTimeout(() => {
        this.runDemoAnalysis();
      }, 1000);
    }
  }
  
  private async startCameraCapture(): Promise<void> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: "environment" } 
      });
      
      const video = document.getElementById("video") as HTMLVideoElement;
      const videoPreview = document.getElementById("video-preview");
      
      if (video && videoPreview) {
        video.srcObject = stream;
        video.play();
        videoPreview.style.display = "block";
        
        // 3???????????
        setTimeout(() => {
          stream.getTracks().forEach(track => track.stop());
          this.runDemoAnalysis();
        }, 3000);
      }
    } catch (error) {
      console.error("Camera access denied:", error);
      alert("??????????????????\n????????????");
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
      const remaining = Math.ceil((100 - percent) / 20);
      eta.textContent = percent >= 100 
        ? "???????" 
        : `??? ${remaining} ?`;
    }
  }
  
  private showResults(result: AnalysisResult): void {
    document.getElementById("progress-section")!.style.display = "none";
    document.getElementById("results-section")!.style.display = "block";
    
    // ?????
    document.getElementById("flight-time")!.textContent = result.flightTime.toFixed(2);
    document.getElementById("takeoff-distance")!.textContent = result.takeoffDistance.toFixed(2);
    document.getElementById("landing-distance")!.textContent = result.landingDistance.toFixed(2);
    document.getElementById("takeoff-contact")!.textContent = result.takeoffContact.toFixed(2);
    document.getElementById("landing-contact")!.textContent = result.landingContact.toFixed(2);
    document.getElementById("max-height")!.textContent = result.maxHeight.toFixed(1);
    
    // ???????
    document.querySelectorAll(".metric-card").forEach((card, index) => {
      setTimeout(() => {
        (card as HTMLElement).style.animation = "pulse 0.5s";
      }, index * 100);
    });
  }
  
  private saveResults(): void {
    const results = this.getCurrentResults();
    const dataStr = JSON.stringify(results, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement("a");
    a.href = url;
    a.download = `hurdle_analysis_${new Date().getTime()}.json`;
    a.click();
    
    alert("? ??????????");
  }
  
  private exportToCSV(): void {
    const results = this.getCurrentResults();
    const csv = `??,?,??
????,${results.flightTime},?
????,${results.takeoffDistance},m
????,${results.landingDistance},m
??????,${results.takeoffContact},?
??????,${results.landingContact},?
?????,${results.maxHeight},cm`;
    
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement("a");
    a.href = url;
    a.download = `hurdle_analysis_${new Date().getTime()}.csv`;
    a.click();
    
    alert("?? CSV????????????????");
  }
  
  private getCurrentResults(): AnalysisResult {
    return {
      flightTime: parseFloat(document.getElementById("flight-time")?.textContent || "0"),
      takeoffDistance: parseFloat(document.getElementById("takeoff-distance")?.textContent || "0"),
      landingDistance: parseFloat(document.getElementById("landing-distance")?.textContent || "0"),
      takeoffContact: parseFloat(document.getElementById("takeoff-contact")?.textContent || "0"),
      landingContact: parseFloat(document.getElementById("landing-contact")?.textContent || "0"),
      maxHeight: parseFloat(document.getElementById("max-height")?.textContent || "0")
    };
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

// ?????
window.addEventListener("DOMContentLoaded", () => {
  new HurdleAnalyzer();
});
