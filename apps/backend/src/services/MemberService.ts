import { inject } from 'inversify';
import { provideSingleton } from '../ioc/ioc';
import { TYPES } from '../ioc/types';
import { MemberDal } from '../repositories/MemberDal';
import { Member, MemberInput } from '../models/Member';
import { AppError } from '../utils/ErrUtils';

@provideSingleton(TYPES.MemberService)
export class MemberService {
  constructor(@inject(TYPES.MemberDal) private memberDal: MemberDal) {}

  async createMember(data: MemberInput): Promise<Member> {
    const existing = await this.memberDal.findByEmail(data.email);
    if (existing) {
      throw AppError.conflict(`Member with email ${data.email} already exists`);
    }
    return this.memberDal.create(data);
  }

  async getMember(id: number): Promise<Member> {
    const member = await this.memberDal.findById(id);
    if (!member) throw AppError.notFound(`Member ${id} not found`);
    return member;
  }

  async getAllMembers(): Promise<Member[]> {
    return this.memberDal.findAll();
  }
}
