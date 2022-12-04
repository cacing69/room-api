import { InstagramMedia } from './instagram.media.entity';
import { Exclude, Expose } from 'class-transformer';
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('instagrams', { schema: 'public' })
export class Instagram {
  @Expose()
  @PrimaryGeneratedColumn('uuid')
  public id!: string;

  @Expose()
  @Column()
  public url!: string;

  @Expose()
  @Column({ nullable: true })
  public coverUrl: string;

  @Expose()
  @Column({ nullable: true })
  public caption: string;

  @Expose()
  @Column({ nullable: true })
  public size: string;

  @Expose()
  @Column({ nullable: true })
  public dimension: string;

  @Expose()
  @Column({ nullable: true })
  public category: string;

  @Expose()
  @Column({ nullable: true })
  public brand: string;

  @Expose()
  @Column({ nullable: true })
  public design: string;

  @Expose()
  @Column({ default: false })
  public isDone: boolean;

  @Expose()
  @Column({ default: false })
  public isSold: boolean;

  @Expose()
  @Column({ nullable: true })
  public price: number;

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

  @OneToMany(() => InstagramMedia, (media) => media.instagram)
  medias: InstagramMedia[];
}
