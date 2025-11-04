import { TestBed } from '@angular/core/testing';

import { Registrationservice } from './registrationservice';

describe('Registrationservice', () => {
  let service: Registrationservice;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Registrationservice);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
