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
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
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
  imports: [CommonModule, FormsModule],
  templateUrl: './parking-guidance-diagram-component.html',
  styleUrl: './parking-guidance-diagram-component.css',
})
export class ParkingGuidanceDiagramComponent {
  @Input() src = '';
  @Input() floor = 'B1';
  @Output() detected = new EventEmitter<ExtractResult>();
  @ViewChild('host', { static: true }) hostRef!: ElementRef<HTMLDivElement>;

  svgEl?: SVGSVGElement;
  overlayBox = signal<{ w: number; h: number; vb?: string }>({ w: 0, h: 0 });
  stations = signal<Station[]>([]);
  lanes = signal<Lane[]>([]);

  async ngAfterViewInit() {
    await this.loadSvg();
  }

  selectedId = signal<string | null>(null);
  private http = inject(HttpClient);
  private renderer = inject(Renderer2);
  private sanitizer = inject(DomSanitizer);

  private slotMap = new Map<string, SVGGElement | SVGGraphicsElement>();
  private bboxMap = new Map<string, DOMRect>();

  private SENSOR_COLORS = new Set(['#000', '#000000', 'rgb(0,0,0)']);
  private CIRCLE_R_MIN = 2;
  private CIRCLE_R_MAX = 7;
  private RECT_SIZE_MAX = 12;

  private getElementCenterInRoot(
    el: SVGGraphicsElement,
    svg: SVGSVGElement
  ): { x: number; y: number } | null {
    const bb = el.getBBox?.();
    if (!bb) return null;
    const p = svg.createSVGPoint();
    p.x = bb.x + bb.width / 2;
    p.y = bb.y + bb.height / 2;
    const ctm = el.getCTM?.();
    return ctm ? p.matrixTransform(ctm) : { x: p.x, y: p.y };
  }

  private getNearestSlotId(x: number, y: number): string | null {
    let bestId: string | null = null;
    let bestDist = Infinity;
    for (const [id, bb] of this.bboxMap.entries()) {
      const cx = bb.x + bb.width / 2;
      const cy = bb.y + bb.height / 2;
      const dx = cx - x;
      const dy = cy - y;
      const d2 = dx * dx + dy * dy;
      if (d2 < bestDist) {
        bestDist = d2;
        bestId = id;
      }
    }
    return bestId;
  }
  detectSensorsFromPlan() {
    if (!this.svgEl) return;
    const result = extractFromInlineSvg(this.svgEl, this.floor);
    this.stations.set(result.stations);
    this.lanes.set(result.lanes);
    this.detected.emit(result);
  }

  private isBlackFill(el: Element): boolean {
    const fill = (el as Element).getAttribute('fill')?.trim()?.toLowerCase() || '';
    if (this.SENSOR_COLORS.has(fill)) return true;
    const style = (el as Element).getAttribute('style') || '';
    if (/fill\s*:\s*#?000\b|rgb\(0\s*,\s*0\s*,\s*0\)/i.test(style)) return true;
    return false;
  }
  private indexSlotsOnce() {
    const host = this.svgHost?.nativeElement;
    const svg = host?.querySelector('svg');
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
  pick(id: string) {
    this.selectedId.set(id === this.selectedId() ? null : id);
  }
  setMeta(key: string, value: any) {
    const cur = this.stations().map((s) =>
      s.id === this.selectedId() ? { ...s, data: { ...(s.data || {}), [key]: value } } : s
    );
    this.stations.set(cur);
  }
  async loadSvg() {
    if (!this.src) return;
    const res = await fetch(this.src);
    const svgText = await res.text();
    const container = this.hostRef.nativeElement;
    container.innerHTML = svgText;
    const found = container.querySelector('svg') as SVGSVGElement | null;
    if (!found) return;
    this.svgEl = found;

    const vb = found.getAttribute('viewBox')?.split(/\s+/).map(Number) ?? [
      0,
      0,
      found.clientWidth || 1000,
      found.clientHeight || 800,
    ];
    const w = vb[2],
      h = vb[3];
    this.overlayBox.set({ w, h, vb: found.getAttribute('viewBox') || undefined });
  }

  @ViewChild('svgHost', { static: false }) svgHost?: ElementRef<HTMLDivElement>;

  private readonly B1_URL = 'assets/parking/08-26-B1[نسخة_لاداري].svg';
  private readonly B2_URL = 'assets/parking/08-26-B2[نسخة_للادارى].svg';

  svgUrl = signal<string>(this.B1_URL);
  svgMarkup = signal<string>('');
  sanitizedSvg: SafeHtml = '';

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

  formSlotId = signal<string>('');
  formStatus = signal<SlotStatus>('free');
  activeSelectedId = signal<string | null>(null);

  simulate = signal(false);
  private timer: any;

  // Zoom & Pan
  private pzWrap?: SVGGElement;
  scale = 1;
  minScale = 0.5;
  maxScale = 4;
  panX = 0;
  panY = 0;
  private isPanning = false;
  private lastX = 0;
  private lastY = 0;

  constructor() {
    effect(() => this.loadSvg());
    effect(() => this.applyDataToSvg());
    effect(() => {
      if (this.simulate()) this.startSim();
      else this.stopSim();
    });
  }

  onSearchInput(e: Event) {
    const v = this.readInputValue(e);
    this.search.set(v);
    this.applyDataToSvg();
  }
  onSlotIdInput(e: Event) {
    const v = this.readInputValue(e);
    this.formSlotId.set(v);
  }
  onStatusChange(e: Event) {
    const v = this.readSelectValue(e) as SlotStatus;
    this.formStatus.set(v);
  }
  onMapChange(e: Event) {
    const key = this.readSelectValue(e);
    this.switchSvg(key);
  }

  switchSvg(mapKey: string) {
    if (mapKey === 'B2') this.svgUrl.set(this.B2_URL);
    else this.svgUrl.set(this.B1_URL);
  }

  toggleSim() {
    this.simulate.update((v) => !v);
  }

  private preparePanZoom() {
    const host = this.svgHost?.nativeElement;
    if (!host) return;
    const svg = host.querySelector('svg');
    if (!svg) return;

    this.pzWrap =
      svg.querySelector<SVGGElement>('#pz-wrap') ??
      document.createElementNS('http://www.w3.org/2000/svg', 'g');

    if (!this.pzWrap.id) {
      this.pzWrap.setAttribute('id', 'pz-wrap');
      const children = Array.from(svg.childNodes);
      for (const ch of children) {
        if (ch !== this.pzWrap) this.pzWrap.appendChild(ch);
      }
      svg.appendChild(this.pzWrap);
    }

    this.scale = 1;
    this.panX = 0;
    this.panY = 0;
    this.applyTransform();

    svg.onmousedown = (e: MouseEvent) => {
      const targetEl = e.target as Element;
      const slotEl = targetEl?.closest?.('[data-slot-id]') as SVGGElement | null;
      if (slotEl) {
        const id = slotEl.getAttribute('data-slot-id');
        if (id) {
          this.activeSelectedId.set(id);
          this.formSlotId.set(id);
          this.highlightSelected(slotEl);
          e.preventDefault();
          return;
        }
      }
      this.isPanning = true;
      this.lastX = e.clientX;
      this.lastY = e.clientY;
      (svg as any).style.cursor = 'grabbing';
    };

    svg.onmousemove = (e: MouseEvent) => {
      if (!this.isPanning) return;
      const dx = e.clientX - this.lastX;
      const dy = e.clientY - this.lastY;
      this.lastX = e.clientX;
      this.lastY = e.clientY;
      this.panX += dx;
      this.panY += dy;
      this.applyTransform();
    };

    const endPan = () => {
      this.isPanning = false;
      (svg as any).style.cursor = 'default';
      (svg as any).style.width = '100%';
    };
    svg.onmouseup = endPan;
    svg.onmouseleave = endPan;

    svg.onwheel = (e: WheelEvent) => {
      e.preventDefault();
      const intensity = 0.0015;
      const delta = -e.deltaY * intensity;
      const newScale = this.clamp(this.scale * (1 + delta), this.minScale, this.maxScale);

      const rect = svg.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const sx = (mx - this.panX) / this.scale;
      const sy = (my - this.panY) / this.scale;

      this.scale = newScale;
      this.panX = mx - sx * this.scale;
      this.panY = my - sy * this.scale;
      this.applyTransform();
    };

    svg.ondblclick = (e: MouseEvent) => {
      const rect = svg.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const factor = 1.25;
      const newScale = this.clamp(this.scale * factor, this.minScale, this.maxScale);

      const sx = (mx - this.panX) / this.scale;
      const sy = (my - this.panY) / this.scale;

      this.scale = newScale;
      this.panX = mx - sx * this.scale;
      this.panY = my - sy * this.scale;
      this.applyTransform();
    };
  }

  private applyTransform() {
    if (this.pzWrap) {
      this.pzWrap.setAttribute(
        'transform',
        `translate(${this.panX}, ${this.panY}) scale(${this.scale})`
      );
    }
  }
  zoomIn() {
    this.scale = this.clamp(this.scale * 1.2, this.minScale, this.maxScale);
    this.applyTransform();
  }
  zoomOut() {
    this.scale = this.clamp(this.scale / 1.2, this.minScale, this.maxScale);
    this.applyTransform();
  }
  resetView() {
    this.scale = 1;
    this.panX = 0;
    this.panY = 0;
    this.applyTransform();
  }
  private clamp(v: number, min: number, max: number) {
    return Math.max(min, Math.min(max, v));
  }

  private applyDataToSvg() {
    const host = this.svgHost?.nativeElement;
    if (!host) return;
    const svg = host.querySelector('svg');
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

    const highlighted = this.filteredIds();
    highlighted.forEach((id) => {
      const el = svg.querySelector(`[data-slot-id="${id}"]`);
      if (el) el.classList.add('slot--highlight');
    });

    for (const s of this._slots()) {
      const el = svg.querySelector<SVGGElement | SVGRectElement>(`[data-slot-id="${s.id}"]`);
      if (!el) continue;

      this.renderer.addClass(el, `slot--${s.status}`);

      const sensor = el.querySelector<SVGCircleElement>('.sensor-dot');
      if (sensor) sensor.setAttribute('data-battery', String(s.sensorBattery ?? ''));

      const title =
        el.querySelector('title') ??
        document.createElementNS('http://www.w3.org/2000/svg', 'title');
      title.textContent = `الحالة: ${
        s.status === 'free'
          ? 'متاح'
          : s.status === 'occupied'
          ? 'مشغول'
          : s.status === 'reserved'
          ? 'محجوز'
          : 'ذوي الإعاقة'
      }${s.plate ? ` | لوحة: ${s.plate}` : ''}${
        s.sensorBattery != null ? ` | بطارية: ${s.sensorBattery}%` : ''
      }`;
      if (!el.querySelector('title')) el.appendChild(title);
    }

    const selected = this.activeSelectedId();
    if (selected) {
      const el = svg.querySelector(`[data-slot-id="${selected}"]`);
      if (el) el.classList.add('slot--selected');
    }

    this.ensureSensors(true);
  }

  private highlightSelected(el: Element) {
    const host = this.svgHost?.nativeElement;
    const svg = host?.querySelector('svg');
    if (svg)
      svg.querySelectorAll('.slot--selected').forEach((e) => e.classList.remove('slot--selected'));
    el.classList.add('slot--selected');
  }

  applyStatusByLabel() {
    const id = this.formSlotId().trim();
    if (!id) return;
    const st = this.formStatus();
    const arr = [...this._slots()];
    const existing = arr.find((s) => s.id === id);
    if (existing) {
      existing.status = st;
    } else {
      arr.push({ id, status: st, sensorBattery: 80 });
    }
    this._slots.set(arr);
    this.activeSelectedId.set(id);
    this.applyDataToSvg();
  }

  private readInputValue(e: Event): string {
    const t = e.target as HTMLInputElement | null;
    return t?.value ?? '';
  }
  private readSelectValue(e: Event): string {
    const t = e.target as HTMLSelectElement | null;
    return t?.value ?? '';
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

    // 👇 هنا التعديل المهم: استخدم SVGTitleElement وتعامل مع null قبل appendChild
    let titleEl = sensorGroup.querySelector<SVGTitleElement>('title');
    if (!titleEl) {
      titleEl = document.createElementNS('http://www.w3.org/2000/svg', 'title') as SVGTitleElement;
      sensorGroup.appendChild(titleEl);
    }
    titleEl.textContent = `ID: ${id}${battery != null ? ` | بطارية: ${battery}%` : ''}`;
  }

  private ensureSensors(withLabel = false) {
    const host = this.svgHost?.nativeElement;
    const svg = host?.querySelector('svg');
    if (!svg) return;
    for (const s of this._slots()) {
      const el = svg.querySelector<SVGGElement | SVGRectElement>(`[data-slot-id="${s.id}"]`);
      if (!el) continue;
      this.upsertSensorForSlot(el as any, s.id, s.sensorBattery, withLabel);
    }
  }
}
