import { useState } from 'react';
import { Building2 } from 'lucide-react';
import { imageUrl } from '../../services/api';
export function HotelImage({ image, name }: { image: string; name: string }) {
  const [failed, setFailed] = useState('');
  const src = imageUrl(image);
  return (
    <div className="hotel-image">
      {src && failed !== src ? (
        <img
          src={src}
          alt={name}
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setFailed(src)}
        />
      ) : (
        <Building2 size={56} aria-hidden="true" />
      )}
    </div>
  );
}
