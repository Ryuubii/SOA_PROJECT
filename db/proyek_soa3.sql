/*
SQLyog Professional v13.1.1 (64 bit)
MySQL - 10.4.21-MariaDB : Database - proyek_soa
*********************************************************************
*/

/*!40101 SET NAMES utf8 */;

/*!40101 SET SQL_MODE=''*/;

/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;
CREATE DATABASE /*!32312 IF NOT EXISTS*/`proyek_soa` /*!40100 DEFAULT CHARACTER SET utf8mb4 */;

USE `proyek_soa`;

/*Table structure for table `access_log` */

DROP TABLE IF EXISTS `access_log`;

CREATE TABLE `access_log` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `api_key` varchar(20) NOT NULL,
  `path` varchar(255) NOT NULL,
  `full_url` varchar(255) NOT NULL,
  `accessed_at` datetime NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

/*Data for the table `access_log` */

/*Table structure for table `anime_list_items` */

DROP TABLE IF EXISTS `anime_list_items`;

CREATE TABLE `anime_list_items` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `mal_id` int(11) NOT NULL,
  `title` varchar(255) NOT NULL,
  `type` varchar(255) NOT NULL,
  `episodes` int(11) NOT NULL,
  `synopsis` longtext NOT NULL,
  `release_date` date NOT NULL,
  `list_id` int(11) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

/*Data for the table `anime_list_items` */

/*Table structure for table `anime_lists` */

DROP TABLE IF EXISTS `anime_lists`;

CREATE TABLE `anime_lists` (
  `list_id` int(11) NOT NULL AUTO_INCREMENT,
  `list_name` varchar(255) NOT NULL,
  `list_item_count` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  PRIMARY KEY (`list_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

/*Data for the table `anime_lists` */

/*Table structure for table `manga_list_items` */

DROP TABLE IF EXISTS `manga_list_items`;

CREATE TABLE `manga_list_items` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `mal_id` int(11) NOT NULL,
  `title` varchar(255) NOT NULL,
  `type` varchar(255) NOT NULL,
  `chapters` int(11) NOT NULL,
  `volumes` int(11) NOT NULL,
  `synopsis` longtext NOT NULL,
  `release_date` date NOT NULL,
  `list_id` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

/*Data for the table `manga_list_items` */

/*Table structure for table `manga_lists` */

DROP TABLE IF EXISTS `manga_lists`;

CREATE TABLE `manga_lists` (
  `list_id` int(11) NOT NULL AUTO_INCREMENT,
  `list_name` varchar(255) NOT NULL,
  `list_item_count` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  PRIMARY KEY (`list_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

/*Data for the table `manga_lists` */

/*Table structure for table `plan` */

DROP TABLE IF EXISTS `plan`;

CREATE TABLE `plan` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `api_key` varchar(20) NOT NULL,
  `type` varchar(255) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4;

/*Data for the table `plan` */

insert  into `plan`(`id`,`api_key`,`type`) values 
(1,'eMz71fs2GfHfQ9Hp0yYl','free'),
(2,'6X31IGw2JSxM5Oq1iVbV','free');

/*Table structure for table `users` */

DROP TABLE IF EXISTS `users`;

CREATE TABLE `users` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `email` varchar(255) NOT NULL,
  `username` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `name` varchar(255) NOT NULL,
  `phone` varchar(255) NOT NULL,
  `address` varchar(255) NOT NULL,
  `balance` int(11) NOT NULL,
  `profile_picture` varchar(255) NOT NULL,
  `api_key` varchar(20) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4;

/*Data for the table `users` */

insert  into `users`(`id`,`email`,`username`,`password`,`name`,`phone`,`address`,`balance`,`profile_picture`,`api_key`) values 
(1,'coba1@gmail.com','coba1','coba1','coba1','2147483647','jalan istts',40000,'/profile_picture/1','eMz71fs2GfHfQ9Hp0yYl'),
(2,'coba2@gmail.com','coba2','coba1','coba1','12345678912','jalan istts',0,'gambar','6X31IGw2JSxM5Oq1iVbV');

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;
