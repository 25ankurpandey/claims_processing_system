import { provideSingleton } from '../ioc/ioc';
import { TYPES } from '../ioc/types';
import { Member, MemberInput } from '../models/Member';
import { Policy } from '../models/Policy';

@provideSingleton(TYPES.MemberDal)
export class MemberDal {
  async create(payload: MemberInput): Promise<Member> {
    return await Member.create(payload);
  }

  async findById(id: number): Promise<Member | null> {
    return await Member.findByPk(id, {
      include: [{ model: Policy, as: 'policy' }],
    });
  }

  async findAll(): Promise<Member[]> {
    return await Member.findAll({
      include: [{ model: Policy, as: 'policy' }],
      order: [['created_at', 'DESC']],
    });
  }

  async findByEmail(email: string): Promise<Member | null> {
    return await Member.findOne({ where: { email } });
  }
}
