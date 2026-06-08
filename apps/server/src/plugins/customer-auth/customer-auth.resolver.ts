import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { Allow, Ctx, Permission, RequestContext } from '@vendure/core';
import { CustomerAuthService } from './customer-auth.service';

@Resolver()
export class CustomerAuthResolver {
  constructor(private readonly customerAuthService: CustomerAuthService) {}

  @Mutation()
  @Allow(Permission.Public)
  requestCustomerEmailOtp(@Args('emailAddress') emailAddress: string) {
    return this.customerAuthService.requestEmailOtp(emailAddress, 'login');
  }

  @Mutation()
  @Allow(Permission.Public)
  verifyCustomerEmailOtp(
    @Ctx() ctx: RequestContext,
    @Args('emailAddress') emailAddress: string,
    @Args('otp') otp: string,
  ) {
    return this.customerAuthService.verifyEmailOtp(ctx, emailAddress, otp);
  }

  @Mutation()
  @Allow(Permission.Public)
  customerGoogleLogin(@Ctx() ctx: RequestContext, @Args('credential') credential: string) {
    return this.customerAuthService.loginWithGoogle(ctx, credential);
  }

  @Mutation()
  @Allow(Permission.Public)
  requestCustomerPasswordResetOtp(@Args('emailAddress') emailAddress: string) {
    return this.customerAuthService.requestEmailOtp(emailAddress, 'password_reset');
  }

  @Mutation()
  @Allow(Permission.Public)
  resetCustomerPasswordWithOtp(
    @Ctx() ctx: RequestContext,
    @Args('emailAddress') emailAddress: string,
    @Args('otp') otp: string,
    @Args('password') password: string,
  ) {
    return this.customerAuthService.resetPasswordWithOtp(ctx, emailAddress, otp, password);
  }
}
