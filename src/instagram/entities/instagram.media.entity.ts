import { Exclude, Expose } from 'class-transformer';
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('instagramMedias', { schema: 'public' })
export class InstagramMedia {
  @Expose()
  @PrimaryGeneratedColumn('uuid')
  public id!: string;

  @Expose()
  @Column()
  public instagramId!: string;

  @Expose()
  @Column()
  public url!: string;

  @Exclude()
  @CreateDateColumn()
  public createdAt!: Date;

  @Exclude()
  @UpdateDateColumn()
  public updatedAt!: Date;

  @Exclude()
  @DeleteDateColumn({ nullable: true })
  public deletedAt?: Date;

  @Exclude()
  @Column({ nullable: true })
  public createdBy?: string;

  @Exclude()
  @Column({ nullable: true })
  public updatedBy?: string;

  @Exclude()
  @Column({ nullable: true })
  public deletedBy?: string;
}
