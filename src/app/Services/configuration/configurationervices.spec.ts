import { TestBed } from '@angular/core/testing';

import { Configurationervices } from './configurationervices';

describe('Configurationervices', () => {
  let service: Configurationervices;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Configurationervices);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
