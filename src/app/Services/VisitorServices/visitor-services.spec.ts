import { TestBed } from '@angular/core/testing';

import { VisitorServices } from './visitor-services';

describe('VisitorServices', () => {
  let service: VisitorServices;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(VisitorServices);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
