import { Component, inject } from '@angular/core';
import { TicketDto, TicketAction } from '../../Domain/tickets/tickets.model';
import { TicketsServices } from '../../Services/Tickets/tickets-services';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-ticket-component',
  imports: [CommonModule, FormsModule],
  templateUrl: './ticket-component.html',
  styleUrl: './ticket-component.css',
})
export class TicketComponent {
  svc = inject(TicketsServices);

  tickets: TicketDto[] = [];
  filtered: TicketDto[] = [];
  loading = false;
  Math = Math;

  q = '';
  action: '' | TicketAction = '';
  gate: string = '';

  page = 1;
  pageSize = 10;

  constructor() {}

  ngOnInit(): void {
    this.loading = true;
    this.svc.getAll().subscribe((list) => {
      this.tickets = list.sort((a, b) => b.id - a.id);
      this.applyFilters();
      this.loading = false;
    });
  }

  gates(): string[] {
    return Array.from(new Set(this.tickets.map((t) => t.gate))).sort();
  }

  applyFilters() {
    const q = this.q.trim().toLowerCase();
    this.filtered = this.tickets.filter((t) => {
      const okQ = !q || t.plate.toLowerCase().includes(q) || String(t.id).includes(q);
      const okA = !this.action || t.action === this.action;
      const okG = !this.gate || t.gate === this.gate;
      return okQ && okA && okG;
    });
    this.page = 1;
  }

  pageItems() {
    const start = (this.page - 1) * this.pageSize;
    return this.filtered.slice(start, start + this.pageSize);
  }

  pagesCount() {
    return Math.max(1, Math.ceil(this.filtered.length / this.pageSize));
  }
}
