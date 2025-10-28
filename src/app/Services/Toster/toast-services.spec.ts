import { TestBed } from '@angular/core/testing';

import { ToastServices } from './toast-services';

describe('ToastServices', () => {
  let service: ToastServices;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ToastServices);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
