import { TestBed } from '@angular/core/testing';

import { SubscriptionType } from './subscription-type';

describe('SubscriptionType', () => {
  let service: SubscriptionType;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SubscriptionType);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
