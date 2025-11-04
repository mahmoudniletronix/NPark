import {
  Component,
  computed,
  effect,
  ElementRef,
  EventEmitter,
  inject,
  Input,
  Output,
  Renderer2,
  signal,
  ViewChild,
  AfterViewInit,
  OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ExtractResult, Lane, Station } from '../../Domain/parking.models/parking.models';
import { extractFromInlineSvg } from './svg-extractor';

type SlotStatus = 'free' | 'occupied' | 'reserved' | 'disabled';

interface Slot {
  id: string;
  status: SlotStatus;
  plate?: string | null;
  sensorBattery?: number;
}

@Component({
  selector: 'app-parking-guidance-diagram-component',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './parking-guidance-diagram-component.html',
  styleUrl: './parking-guidance-diagram-component.css',
})
export class ParkingGuidanceDiagramComponent implements AfterViewInit, OnDestroy {
  @Input() floor = 'B1';
  @Output() detected = new EventEmitter<ExtractResult>();

  @ViewChild('svgHost', { static: true }) svgHost?: ElementRef<HTMLDivElement>;

  // DI
  private http = inject(HttpClient);
  private renderer = inject(Renderer2);
  private sanitizer = inject(DomSanitizer);

  // SVG state
  svgEl?: SVGSVGElement;
  sanitizedSvg: SafeHtml = '';
  svgMarkup = signal<string>('');

  // ملفات الجراج
  private readonly B1_URL = 'assets/parking/08-26-B1[نسخة_لاداري].svg';
  private readonly B2_URL = 'assets/parking/08-26-B2[نسخة_للادارى].svg';
  svgUrl = signal<string>(this.B1_URL);

  // Extracted
  stations = signal<Station[]>([]);
  lanes = signal<Lane[]>([]);

  // اختيار/بحث
  search = signal<string>('');
  filteredIds = computed(() => {
    const q = this.search().trim().toLowerCase();
    if (!q) return new Set<string>();
    return new Set(
      this._slots()
        .map((s) => s.id)
        .filter((id) => id.toLowerCase().includes(q))
    );
  });

  // كاونتر الحالات
  private _slots = signal<Slot[]>([
    { id: 'L1-A1', status: 'free', sensorBattery: 88 },
    { id: 'L1-A2', status: 'occupied', plate: 'س م ن ١٢٣٤', sensorBattery: 72 },
    { id: 'L1-A6', status: 'occupied', plate: 'م ر ك ٢٣٤٥', sensorBattery: 65 },
    { id: 'L1-B3', status: 'reserved', sensorBattery: 90 },
    { id: 'L1-B7', status: 'disabled', sensorBattery: 100 },
  ]);
  freeCount = computed(() => this._slots().filter((s) => s.status === 'free').length);
  occupiedCount = computed(() => this._slots().filter((s) => s.status === 'occupied').length);
  reservedCount = computed(() => this._slots().filter((s) => s.status === 'reserved').length);
  disabledCount = computed(() => this._slots().filter((s) => s.status === 'disabled').length);

  formSlotId = signal<string>('');
  formStatus = signal<SlotStatus>('free');
  activeSelectedId = signal<string | null>(null);

  // محاكاة
  simulate = signal(false);
  private timer: any;

  // Zoom & Pan
  private pzWrap?: SVGGElement;
  private wheelBound?: (e: WheelEvent) => void;
  private dblClickBound?: (e: MouseEvent) => void;
  private mouseDownBound?: (e: MouseEvent) => void;
  private mouseMoveBound?: (e: MouseEvent) => void;
  private mouseUpBound?: (e: MouseEvent) => void;

  scale = 1;
  minScale = 0.4;
  maxScale = 6;
  panX = 0;
  panY = 0;

  private viewW = 1000;
  private viewH = 800;
  private hostW = 1000;
  private hostH = 800;

  private isPanning = false;
  private lastX = 0;
  private lastY = 0;

  private touchStartDist = 0;
  private touchStartScale = 1;
  private touchMid?: { x: number; y: number };

  private ro?: ResizeObserver;

  private slotMap = new Map<string, SVGGElement | SVGGraphicsElement>();
  private bboxMap = new Map<string, DOMRect>();

  constructor() {
    effect(() => {
      const url = this.svgUrl();
      this.loadSvg(url);
    });

    effect(() => this.applyDataToSvg());

    effect(() => {
      if (this.simulate()) this.startSim();
      else this.stopSim();
    });
  }

  ngAfterViewInit() {
    this.loadSvg(this.svgUrl());
  }

  ngOnDestroy(): void {
    this.stopSim();
    this.ro?.disconnect();
    this.detachGlobalHandlers();
  }

  // ====== تحميل الـSVG
  private async loadSvg(url: string) {
    if (!url) return;

    // فضّل إلغاء ربط الأحداث القديمة قبل حقن ملف جديد
    this.detachGlobalHandlers();

    const svgText = await this.http.get(url, { responseType: 'text' }).toPromise();
    if (!svgText) return;

    this.svgMarkup.set(svgText);
    this.sanitizedSvg = this.sanitizer.bypassSecurityTrustHtml(svgText);

    queueMicrotask(() => {
      const host = this.svgHost?.nativeElement;
      const found = host?.querySelector('svg') as SVGSVGElement | null;
      if (!found) return;

      this.svgEl = found;

      // إعادة تهيئة
      (this.svgEl as any).__boundClick__ = false;

      this.preparePanZoom();
      this.indexSlotsOnce();
      this.applyDataToSvg();
    });
  }

  onMapChange(e: Event) {
    const key = (e.target as HTMLSelectElement).value;
    this.switchSvg(key);
  }

  switchSvg(mapKey: string) {
    this.svgUrl.set(mapKey === 'B2' ? this.B2_URL : this.B1_URL);
    this.activeSelectedId.set(null);
  }

  onSearchInput(e: Event) {
    this.search.set((e.target as HTMLInputElement).value ?? '');
    this.applyDataToSvg();
  }

  onSlotIdInput(e: Event) {
    this.formSlotId.set((e.target as HTMLInputElement).value ?? '');
  }

  onStatusChange(e: Event) {
    this.formStatus.set((e.target as HTMLSelectElement).value as SlotStatus);
  }

  exportJson() {
    if (!this.svgEl) return;
    const result = extractFromInlineSvg(this.svgEl, this.floor);
    this.stations.set(result.stations);
    this.lanes.set(result.lanes);
    this.detected.emit(result);

    const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `garage-${this.floor}.json`;
    a.click();
  }

  private highlightSelected(el: Element) {
    const svg = this.svgEl;
    if (!svg) return;
    svg.querySelectorAll('.slot--selected').forEach((e) => e.classList.remove('slot--selected'));
    el.classList.add('slot--selected');
  }

  applyStatusByLabel() {
    const id = this.formSlotId().trim();
    if (!id) return;
    const st = this.formStatus();
    const arr = [...this._slots()];
    const existing = arr.find((s) => s.id === id);
    if (existing) existing.status = st;
    else arr.push({ id, status: st, sensorBattery: 80 });
    this._slots.set(arr);
    this.activeSelectedId.set(id);
    this.applyDataToSvg();
    this.zoomToSlot(id, 2.2); // سلوك لطيف: ركّز على الخانة بعد التعديل
  }

  private indexSlotsOnce() {
    const svg = this.svgEl;
    if (!svg) return;
    this.slotMap.clear();
    this.bboxMap.clear();

    svg.querySelectorAll<SVGGElement | SVGGraphicsElement>('[data-slot-id]').forEach((el) => {
      const id = el.getAttribute('data-slot-id');
      if (!id) return;
      this.slotMap.set(id, el);
      const bb = (el as any).getBBox?.() as DOMRect | undefined;
      if (bb) this.bboxMap.set(id, bb);
    });
  }

  private applyDataToSvg() {
    const svg = this.svgEl;
    if (!svg) return;

    svg.querySelectorAll('[data-slot-id]').forEach((el) => {
      el.classList.remove(
        'slot--free',
        'slot--occupied',
        'slot--reserved',
        'slot--disabled',
        'slot--highlight',
        'slot--selected'
      );
    });

    // تظليل البحث
    const highlighted = this.filteredIds();
    highlighted.forEach((id) => {
      const el = svg.querySelector(`[data-slot-id="${id}"]`);
      if (el) el.classList.add('slot--highlight');
    });

    // ألوان الحالة + sensor-dot
    for (const s of this._slots()) {
      const el = svg.querySelector<SVGGElement | SVGRectElement>(`[data-slot-id="${s.id}"]`);
      if (!el) continue;
      this.renderer.addClass(el, `slot--${s.status}`);
      this.upsertSensorForSlot(el as any, s.id, s.sensorBattery, /*withLabel*/ false);
    }

    // اختيار حالي
    const selected = this.activeSelectedId();
    if (selected) {
      const el = svg.querySelector(`[data-slot-id="${selected}"]`);
      if (el) el.classList.add('slot--selected');
    }

    // Bind click مرة واحدة
    this.bindPointerHandlersOnce();
  }

  private upsertSensorForSlot(
    slotEl: SVGGElement | SVGGraphicsElement,
    id: string,
    battery?: number,
    withLabel = false
  ) {
    let sensorGroup = slotEl.querySelector<SVGGElement>(':scope > g.sensor');
    if (!sensorGroup) {
      sensorGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g') as SVGGElement;
      sensorGroup.setAttribute('class', 'sensor');
      slotEl.appendChild(sensorGroup);
    }

    let dot = sensorGroup.querySelector<SVGCircleElement>('circle.sensor-dot');
    if (!dot) {
      dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle') as SVGCircleElement;
      dot.setAttribute('class', 'sensor-dot');
      dot.setAttribute('r', '5');
      dot.setAttribute('stroke', '#000');
      dot.setAttribute('stroke-width', '0.75');
      sensorGroup.appendChild(dot);
    }
    if (battery != null) dot.setAttribute('data-battery', String(battery));

    let label = sensorGroup.querySelector<SVGTextElement>('text.sensor-label');
    if (withLabel) {
      if (!label) {
        label = document.createElementNS('http://www.w3.org/2000/svg', 'text') as SVGTextElement;
        label.setAttribute('class', 'sensor-label');
        label.setAttribute('font-size', '9');
        label.setAttribute('text-anchor', 'end');
        sensorGroup.appendChild(label);
      }
      label.textContent = id;
    } else if (label) {
      label.remove();
      label = null;
    }

    const bb = (slotEl as any).getBBox?.() as DOMRect | undefined;
    if (!bb) return;
    const offset = 6;
    const cx = bb.x + bb.width - offset;
    const cy = bb.y + offset;
    dot.setAttribute('cx', String(cx));
    dot.setAttribute('cy', String(cy));
    if (label) {
      label.setAttribute('x', String(cx - 2));
      label.setAttribute('y', String(cy + 10));
    }

    let titleEl = sensorGroup.querySelector<SVGTitleElement>('title');
    if (!titleEl) {
      titleEl = document.createElementNS('http://www.w3.org/2000/svg', 'title') as SVGTitleElement;
      sensorGroup.appendChild(titleEl);
    }
    titleEl.textContent = `ID: ${id}${battery != null ? ` | بطارية: ${battery}%` : ''}`;
  }

  // ====== Pan & Zoom
  private preparePanZoom() {
    const svg = this.svgEl;
    if (!svg) return;

    // أنشئ / استخدم غلاف التحريك/التكبير
    this.pzWrap =
      svg.querySelector<SVGGElement>('#pz-wrap') ??
      document.createElementNS('http://www.w3.org/2000/svg', 'g');

    if (!this.pzWrap.id) {
      this.pzWrap.setAttribute('id', 'pz-wrap');
      const kids = Array.from(svg.childNodes);
      for (const k of kids) if (k !== this.pzWrap) this.pzWrap.appendChild(k);
      svg.appendChild(this.pzWrap);
    }

    // ضبط الـviewBox
    const vb = (svg.getAttribute('viewBox') || '').split(/\s+/).map(Number);
    if (vb.length === 4 && vb.every((n) => !Number.isNaN(n))) {
      this.viewW = vb[2];
      this.viewH = vb[3];
    } else {
      const bb = svg.getBBox?.();
      this.viewW = bb?.width || svg.clientWidth || 1000;
      this.viewH = bb?.height || svg.clientHeight || 800;
      svg.setAttribute('viewBox', `0 0 ${this.viewW} ${this.viewH}`);
    }

    // قياس حاوية الـSVG
    const host = this.svgHost?.nativeElement;
    if (host) {
      this.ro?.disconnect();
      this.ro = new ResizeObserver(() => {
        const rect = host.getBoundingClientRect();
        this.hostW = rect.width;
        this.hostH = rect.height;
        this.fitView(); // أعِد الضبط عند تغيير الحجم
      });
      this.ro.observe(host);
      const rect = host.getBoundingClientRect();
      this.hostW = rect.width;
      this.hostH = rect.height;
    }

    // اربط الأحداث (ماوس + كيبورد + تاتش)
    this.bindWheel(svg);
    this.bindMousePan(svg);
    this.bindPinch(svg);

    // بداية مناسبة
    this.fitView();
  }

  private bindWheel(svg: SVGSVGElement) {
    // امسح إن كان فيه ربط سابق
    this.wheelBound && svg.removeEventListener('wheel', this.wheelBound as any);
    this.dblClickBound && svg.removeEventListener('dblclick', this.dblClickBound as any);

    this.wheelBound = (e: WheelEvent) => {
      e.preventDefault();
      const rect = svg.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const factor = 1 + -e.deltaY * 0.0015;
      this.zoomAt(factor, mx, my);
    };
    this.dblClickBound = (e: MouseEvent) => {
      const rect = svg.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      this.zoomAt(1.25, mx, my);
    };

    svg.addEventListener('wheel', this.wheelBound, { passive: false });
    svg.addEventListener('dblclick', this.dblClickBound);
  }

  private bindMousePan(svg: SVGSVGElement) {
    // امسح إن كان فيه ربط سابق
    this.mouseDownBound && svg.removeEventListener('mousedown', this.mouseDownBound);
    this.mouseMoveBound && window.removeEventListener('mousemove', this.mouseMoveBound);
    this.mouseUpBound && window.removeEventListener('mouseup', this.mouseUpBound);

    this.mouseDownBound = (e: MouseEvent) => {
      const t = e.target as Element;
      if (t?.closest?.('[data-slot-id]')) return; // ما نحركش لو ضغط على خانة
      this.isPanning = true;
      this.lastX = e.clientX;
      this.lastY = e.clientY;
      (svg as any).style.cursor = 'grabbing';
    };

    this.mouseMoveBound = (e: MouseEvent) => {
      if (!this.isPanning) return;
      const dx = e.clientX - this.lastX;
      const dy = e.clientY - this.lastY;
      this.lastX = e.clientX;
      this.lastY = e.clientY;
      this.panX += dx;
      this.panY += dy;
      this.applyTransform();
    };

    this.mouseUpBound = () => {
      this.isPanning = false;
      (svg as any).style.cursor = 'default';
    };

    svg.addEventListener('mousedown', this.mouseDownBound);
    window.addEventListener('mousemove', this.mouseMoveBound);
    window.addEventListener('mouseup', this.mouseUpBound);
    svg.addEventListener('mouseleave', this.mouseUpBound);
  }

  private bindPinch(svg: SVGSVGElement) {
    svg.addEventListener('touchstart', (e) => e.preventDefault(), { passive: false });

    svg.addEventListener(
      'touchstart',
      (e: TouchEvent) => {
        if (e.touches.length === 1) {
          this.isPanning = true;
          this.lastX = e.touches[0].clientX;
          this.lastY = e.touches[0].clientY;
        } else if (e.touches.length === 2) {
          const [p1, p2] = e.touches;
          this.touchStartDist = Math.hypot(p2.clientX - p1.clientX, p2.clientY - p1.clientY);
          this.touchStartScale = this.scale;

          const rect = svg.getBoundingClientRect();
          const mx = (p1.clientX + p2.clientX) / 2 - rect.left;
          const my = (p1.clientY + p2.clientY) / 2 - rect.top;
          this.touchMid = { x: mx, y: my };
        }
      },
      { passive: false }
    );

    svg.addEventListener(
      'touchmove',
      (e: TouchEvent) => {
        e.preventDefault();
        if (e.touches.length === 1 && this.isPanning) {
          const t = e.touches[0];
          const dx = t.clientX - this.lastX;
          const dy = t.clientY - this.lastY;
          this.lastX = t.clientX;
          this.lastY = t.clientY;
          this.panX += dx;
          this.panY += dy;
          this.applyTransform();
        } else if (e.touches.length === 2 && this.touchMid) {
          const [p1, p2] = e.touches;
          const dist = Math.hypot(p2.clientX - p1.clientX, p2.clientY - p1.clientY);
          const factor = dist / (this.touchStartDist || dist);
          const targetScale = this.clamp(
            this.touchStartScale * factor,
            this.minScale,
            this.maxScale
          );
          const { x, y } = this.touchMid;
          const sx = (x - this.panX) / this.scale;
          const sy = (y - this.panY) / this.scale;
          this.scale = targetScale;
          this.panX = x - sx * this.scale;
          this.panY = y - sy * this.scale;
          this.applyTransform();
        }
      },
      { passive: false }
    );

    const endTouch = () => {
      this.isPanning = false;
      this.touchMid = undefined;
    };
    svg.addEventListener('touchend', endTouch);
    svg.addEventListener('touchcancel', endTouch);
  }

  private detachGlobalHandlers() {
    if (!this.svgEl) return;
    this.wheelBound && this.svgEl.removeEventListener('wheel', this.wheelBound);
    this.dblClickBound && this.svgEl.removeEventListener('dblclick', this.dblClickBound);
    this.mouseDownBound && this.svgEl.removeEventListener('mousedown', this.mouseDownBound);
    this.mouseMoveBound && window.removeEventListener('mousemove', this.mouseMoveBound);
    this.mouseUpBound && window.removeEventListener('mouseup', this.mouseUpBound);
  }

  private applyTransform() {
    if (!this.pzWrap || !this.svgEl) return;

    // حدود بسيطة تمنع الطيران بعيدًا
    const maxPanX = this.hostW;
    const maxPanY = this.hostH;
    const minPanX = -this.viewW * this.scale;
    const minPanY = -this.viewH * this.scale;

    this.panX = this.clamp(this.panX, minPanX + -0.2 * this.hostW, maxPanX * 0.2);
    this.panY = this.clamp(this.panY, minPanY + -0.2 * this.hostH, maxPanY * 0.2);

    this.pzWrap.setAttribute(
      'transform',
      `translate(${this.panX}, ${this.panY}) scale(${this.scale})`
    );
  }

  private zoomAt(factor: number, mx: number, my: number) {
    const newScale = this.clamp(this.scale * factor, this.minScale, this.maxScale);
    const sx = (mx - this.panX) / this.scale;
    const sy = (my - this.panY) / this.scale;
    this.scale = newScale;
    this.panX = mx - sx * this.scale;
    this.panY = my - sy * this.scale;
    this.applyTransform();
  }

  // ====== أزرار التكبير/التصغير (حول مركز الـSVG)
  private svgCenter(): { mx: number; my: number } {
    const svg = this.svgEl;
    if (!svg) return { mx: this.hostW / 2, my: this.hostH / 2 };
    const w = svg.clientWidth || this.viewW;
    const h = svg.clientHeight || this.viewH;
    return { mx: w / 2, my: h / 2 };
  }

  zoomIn(step = 1.2) {
    const { mx, my } = this.svgCenter();
    this.zoomAt(step, mx, my);
  }

  zoomOut(step = 1.2) {
    const { mx, my } = this.svgCenter();
    this.zoomAt(1 / step, mx, my);
  }

  resetView() {
    this.fitView();
  }

  private clamp(v: number, min: number, max: number) {
    return Math.max(min, Math.min(max, v));
  }

  fitView() {
    const scaleX = this.hostW / this.viewW;
    const scaleY = this.hostH / this.viewH;
    const s = Math.min(scaleX, scaleY) * 0.95;
    this.scale = this.clamp(s, this.minScale, this.maxScale);

    const contentW = this.viewW * this.scale;
    const contentH = this.viewH * this.scale;
    this.panX = (this.hostW - contentW) / 2;
    this.panY = (this.hostH - contentH) / 2;
    this.applyTransform();
  }

  centerOnBox(bb: DOMRect, targetScale?: number) {
    const s = targetScale ? this.clamp(targetScale, this.minScale, this.maxScale) : this.scale;
    this.scale = s;
    const cx = bb.x + bb.width / 2;
    const cy = bb.y + bb.height / 2;
    this.panX = (this.svgEl?.clientWidth || this.hostW) / 2 - cx * this.scale;
    this.panY = (this.svgEl?.clientHeight || this.hostH) / 2 - cy * this.scale;
    this.applyTransform();
  }

  zoomToSlot(id: string, targetScale = 2.5) {
    const bb = this.bboxMap.get(id);
    if (!bb) return;
    this.centerOnBox(bb, targetScale);
    this.activeSelectedId.set(id);
    this.applyDataToSvg();
  }

  toggleSim() {
    this.simulate.update((v) => !v);
  }

  private startSim() {
    this.timer = setInterval(() => {
      const copy = [...this._slots()];
      if (!copy.length) return;
      const i = Math.floor(Math.random() * copy.length);
      const s = copy[i];
      s.status = this.nextStatus(s.status);
      s.plate = s.status === 'occupied' ? 'ع س ص ٤٥٦٧' : null;
      s.sensorBattery = Math.max(15, (s.sensorBattery ?? 80) - (Math.random() < 0.2 ? 1 : 0));
      this._slots.set(copy);
      this.applyDataToSvg();
    }, 1300);
  }

  private stopSim() {
    if (this.timer) clearInterval(this.timer);
  }

  private nextStatus(x: SlotStatus): SlotStatus {
    const r = Math.random();
    if (x === 'free') return r < 0.7 ? 'occupied' : 'free';
    if (x === 'occupied') return r < 0.5 ? 'free' : 'occupied';
    if (x === 'reserved') return r < 0.2 ? 'free' : 'reserved';
    return 'disabled';
  }

  private bindPointerHandlersOnce() {
    const svg = this.svgEl;
    if (!svg) return;
    if ((svg as any).__boundClick__) return;
    (svg as any).__boundClick__ = true;

    svg.addEventListener('click', (e: MouseEvent) => {
      const t = e.target as Element;
      const slotEl = t?.closest?.('[data-slot-id]') as SVGGElement | null;
      if (slotEl) {
        const id = slotEl.getAttribute('data-slot-id');
        if (id) {
          this.activeSelectedId.set(id);
          this.formSlotId.set(id);
          this.highlightSelected(slotEl);
        }
      }
    });
  }
}
