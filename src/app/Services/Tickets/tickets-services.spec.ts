import { TestBed } from '@angular/core/testing';

import { TicketsServices } from './tickets-services';

describe('TicketsServices', () => {
  let service: TicketsServices;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TicketsServices);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
